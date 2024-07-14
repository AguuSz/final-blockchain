const Factory = artifacts.require("CFPFactory");
const CFP = artifacts.require("CFP");

const shared = require("./shared")

const verifyThrows = shared.verifyThrows;
const now = shared.now;
const gen = new shared.HashGenerator();
const checkEvent = shared.checkEvent;

contract('CFP Factory', (accounts) => {
    describe('Inicialización del contrato', function () {
        var factory;
        var owner;
        before(async function () {
            factory = await Factory.new();
            owner = accounts[0];
        });
        it("debe tener el dueño correcto", async () => {
            assert.equal(owner, await factory.owner());
        })
        it("no debe haber creadores predefinidos", async () => {
            assert.equal(0, await factory.creatorsCount())
            await verifyThrows(async () => {
                await factory.creators(0);
            }, /revert/);
        })
    });
    describe('Gestión de llamados', function () {
        var factory;
        var cfps = [];
        var closingTime;
        var callIds = [];
        var pending = 0;
        before(async function () {
            factory = await Factory.new();
        });
        it('debe permitir el registro de creadores', async () => {
            for (let i = 0; i < accounts.length; i += 2) {
                await factory.register({ from: accounts[i] });
                pending++;
            }
        });
        it('debe identificar correctamente el estado de los registrados', async () => {
            for (let i = 0; i < accounts.length; i++) {
                assert.equal(i % 2 == 0, await factory.isRegistered(accounts[i]));
                assert.equal(false, await factory.isAuthorized(accounts[i]));
            }
        });
        it('debe devolver la cantidad de registros pendientes', async () => {
            assert.equal(pending, await factory.pendingCount())
        });
        it('debe devolver la cantidad de registros pendientes solo al dueño', async () => {
            await verifyThrows(async () => {
                await factory.pendingCount({ from: accounts[1] })
            }, /el creador puede hacer esta llamada/);
        });
        it('debe devolver la lista de pendientes correcta', async () => {
            let p = await factory.getAllPending();
            assert.equal(pending, p.length);
            for (let i = 0; i < accounts.length; i += 2) {
                assert(p.includes(accounts[i]), `${accounts[i]} debería estar en la lista de pendientes`);
            }
        });
        it('debe devolver correctamente los pendientes', async () => {
            let p = []
            for (let i = 0; i < pending; i++) {
                p.push(await factory.getPending(i));
            }
            for (let i = 0; i < accounts.length; i += 2) {
                assert(p.includes(accounts[i]), `${accounts[i]} debería estar en la lista de pendientes`);
            }
            await verifyThrows(async () => {
                await factory.getPending(pending);
            }, /revert/);
        });
        it('debe devolver los pendientes solo al dueño', async () => {
            await verifyThrows(async () => {
                await factory.getAllPending({ from: accounts[1] });
            }, /el creador puede hacer esta llamada/);
            await verifyThrows(async () => {
                await factory.getPending(0, { from: accounts[1] });
            }, /el creador puede hacer esta llamada/);
        });
        it('debe rechazar la creación de llamados por cuentas no autorizadas', async () => {
            closingTime = now() + 100;
            for (let i = 0; i < accounts.length; i++) {
                let creator = accounts[i];
                let callId = gen.get(i)
                await verifyThrows(async () => {
                    await factory.create(callId, closingTime + i, { from: creator });
                }, /No autorizado/);
            }
        });
        it('debe rechazar la creación de llamados por parte del dueño para cuentas no autorizadas', async () => {
            closingTime = now() + 100;
            for (let i = 0; i < accounts.length; i++) {
                let creator = accounts[i];
                let callId = gen.get(i)
                await verifyThrows(async () => {
                    await factory.createFor(callId, closingTime + i, creator);
                }, /No autorizado/);
            }
        });
        it('debe permitir al dueño autorizar creadores', async () => {
            for (let account of accounts) {
                await factory.authorize(account);
            }
        });
        it('debe actualizar correctamente la lista de pendientes', async () => {
            let p = await factory.getAllPending();
            assert.equal(0, p.length);
            let pendingCount = await factory.pendingCount();
            assert.equal(0, pendingCount);
        });
        it('debe permitir desautorizar solo al dueño', async () => {
            await verifyThrows(async () => {
                await factory.unauthorize(accounts[0], { from: accounts[1] });
            }, /el creador puede hacer esta llamada/);
        });
        it('debe permitir desautorizar al dueño', async () => {
            await factory.unauthorize(accounts[accounts.length - 1]);
        });
        it('debe identificar correctamente el estado de los autorizados', async () => {
            for (let i = 0; i < accounts.length; i++) {
                assert.equal(i != accounts.length - 1, await factory.isRegistered(accounts[i]));
                assert.equal(i != accounts.length - 1, await factory.isAuthorized(accounts[i]));
            }
        });
        it('debe permitir reautorizar', async () => {
            await factory.authorize(accounts[accounts.length - 1]);
        });
        it('debe permitir la creación de llamados', async () => {
            closingTime = now() + 100;
            for (let i = 0; i < accounts.length; i++) {
                let creator = accounts[i];
                let callId = gen.get(i)
                callIds.push(callId);
                await factory.create(callId, closingTime + i, { from: creator });
            }
        });
        it('debe permitir al dueño la creación de llamados a nombre de otro', async () => {
            for (let i = 0; i < accounts.length; i++) {
                let creator = accounts[i];
                let callId = gen.get(accounts.length + i)
                callIds.push(callId);
                await factory.createFor(callId, closingTime + accounts.length + i, creator);
            }
            gen.set(2 * accounts.length);
        });
        it('deber rechazar el llamado a createFor por usuarios que no son el dueño', async () => {
            await verifyThrows(async () => {
                await factory.createFor(gen.next(), closingTime, accounts[1], { from: accounts[1] });
            }, /el creador puede hacer esta llamada/)
        });
        it('debe rechazar la creación de llamados con el mismo callId', async () => {
            await verifyThrows(async () => {
                await factory.create(callIds[0], closingTime);
            }, /llamado ya existe/);
        });
        it('debe rechazar la creación de llamados por parte del dueño con el mismo callId', async () => {
            await verifyThrows(async () => {
                await factory.createFor(callIds[0], closingTime, accounts[1]);
            }, /llamado ya existe/);
        });
        it('debe devolver la cantidad correcta de creadores', async () => {
            assert.equal(accounts.length, await factory.creatorsCount())
        });
        it('debe devolver la cantidad correcta de llamados por creador', async () => {
            for (let creator of accounts) {
                assert.equal(2, await factory.createdByCount(creator))
            }
        });
        it('debe devolver el callId correcto para cada creador', async () => {
            for (let i = 0; i < accounts.length; i++) {
                assert.equal(callIds[i], await factory.createdBy(accounts[i], 0));
                assert.equal(callIds[accounts.length + i], await factory.createdBy(accounts[i], 1));
            }
        });
        it('debe devolver el creador correcto para cada llamado', async () => {
            for (let i = 0; i < callIds.length; i++) {
                let cfp = await factory.calls(callIds[i]);
                assert.equal(accounts[i % accounts.length], cfp.creator);
            }
        });
        it('debe devolver direcciones de contrato válidas', async () => {
            for (let callId of callIds) {
                let cfpData = await factory.calls(callId);
                let cfp = await CFP.at(cfpData.cfp);
                cfps.push(cfp);
            }
        });
        it('los contratos deben tener el creador correcto', async () => {
            for (let cfp of cfps) {
                assert.equal(factory.address, await cfp.creator());
            }
        });
        it('los contratos deben tener el callId correcto', async () => {
            for (let i = 0; i < cfps.length; i++) {
                let cfp = cfps[i];
                let callId = callIds[i];
                assert.equal(callId, await cfp.callId());
            }
        });
        it('los contratos deben tener el tiempo de cierre correcto', async () => {
            for (let i = 0; i < cfps.length; i++) {
                let cfp = cfps[i];
                assert.equal(closingTime + i, (await cfp.closingTime()).toNumber());
            }
        });
        it('los contratos deben permitir registrar propuestas', async () => {
            for (let cfp of cfps) {
                let proposal = gen.next();
                await cfp.registerProposal(proposal);
            }
        });
        it('debe rechazar el registro en llamados inexistentes', async () => {
            await verifyThrows(async () => {
                await factory.registerProposal(gen.next(), gen.next());
            }, /llamado no existe/);
        });
        it('debe registrar correctamente propuestas', async () => {
            for (let cfp of cfps) {
                let callId = await cfp.callId();
                let proposal = callId;
                let account = accounts[Math.trunc(Math.random() * accounts.length)];
                await factory.registerProposal(callId, proposal, { from: account });
                let proposalData = await cfp.proposalData(proposal);
                assert.equal(account, proposalData.sender);
            }
        })
        it('debe rechazar propuestas ya registradas', async () => {
            for (let cfp of cfps) {
                let callId = await cfp.callId();
                let proposal = callId;
                let account = accounts[Math.trunc(Math.random() * accounts.length)];
                await verifyThrows(async () => {
                    await factory.registerProposal(callId, proposal, { from: account });
                }, /ya ha sido registrada/)
            }
        })
    });
})