const CFP = artifacts.require("CFP");

const shared = require("./shared")

const verifyThrows = shared.verifyThrows;
const now = shared.now;
const gen = new shared.HashGenerator();
const checkEvent = shared.checkEvent;
const emptyAddress = shared.emptyAddress;
const BN = web3.utils.BN



contract('Call for Proposals', (accounts) => {
    describe('Inicialización del contrato', function () {
        var closingTime;
        var cfp;
        var callId;
        before(async function () {
            callId = gen.next();
            closingTime = (await web3.eth.getBlock('latest')).timestamp + 100;
            cfp = await CFP.new(callId, closingTime);
        });
        it('no debe haber propuestas', async () => {
            const proposalCount = await cfp.proposalCount();
            assert.equal(proposalCount, 0);
        });
        it('tiene que tener el callId correcto', async () => {
            const contractCallId = await cfp.callId();
            assert.equal(callId, contractCallId);
        });
        it('tiene que tener el tiempo de cierre correcto', async () => {
            const contractClosingTime = await cfp.closingTime();
            assert.equal(closingTime, contractClosingTime);
        })
    });
    describe('Inicialización incorrecta del contrato', function () {
        it('debe rechazar tiempos de cierre que están en el pasado', async () => {
            const currentBlock = await web3.eth.getBlock('latest');
            await verifyThrows(async () => {
                await CFP.new(gen.next(), currentBlock.timestamp)
            }, /El cierre de la convocatoria no puede estar en el pasado/)
        })

    })
    describe('Registro de propuestas', function () {
        var initialBlock;
        var lastBlock;
        var currentTime;
        var cfp;
        var proposalCount;
        var closingTime;
        var proposals = [];
        before(async function () {
            initialBlock = await web3.eth.getBlock('latest');
            currentTime = initialBlock.timestamp;
            closingTime = currentTime + 100;
            cfp = await CFP.new(gen.get(0), closingTime);
            proposalCount = 5 + Math.trunc(Math.random() * 10);
            for (let i = 0; i < proposalCount; i++) {
                let proposal = gen.next();
                await cfp.registerProposal(proposal);
                proposals.push(proposal)
            }
            lastBlock = await web3.eth.getBlock('latest');
        });
        it('debe devolver la cantidad correcta de propuestas', async () => {
            let _proposalCount = await cfp.proposalCount();
            assert.equal(proposalCount, _proposalCount);
        });
        it('debe devolver todas las propuestas registradas', async () => {
            for (let i = 0; i < proposalCount; i++) {
                let proposal = await cfp.proposals(i);
                assert.equal(proposals[i], proposal);
            }
        });
        it('no debe tener propuestas que no han sido registradas', async () => {
            await verifyThrows(async () => {
                await cfp.proposals(proposalCount);
            }, /revert/);
        });
        it('debe devolver números de bloque plausibles', async () => {
            let blockNumber = new BN(initialBlock.number);
            for (let i = 0; i < proposalCount; i++) {
                let proposalData = await cfp.proposalData(proposals[i]);
                let pbn = new BN(proposalData.blockNumber)
                assert(pbn.gte(blockNumber),
                    `Block ${pbn} should be >= ${blockNumber}`);
                assert(pbn.lten(lastBlock.number),
                    `Block ${pbn} should be <= ${lastBlock.number}`);
                blockNumber = pbn;
            }
        });
        it('debe devolver información de tiempo correcta', async () => {
            for (let i = 0; i < proposalCount; i++) {
                let proposalData = await cfp.proposalData(proposals[i]);
                let blockNumber = proposalData.blockNumber;
                let timestamp = proposalData.timestamp;
                let blockTimestamp = (await web3.eth.getBlock(blockNumber)).timestamp;
                assert.equal(blockTimestamp, timestamp);
                assert.equal(blockTimestamp, await cfp.proposalTimestamp(proposals[i]));
            }
        });
        it('debe devolver el emisor correcto', async () => {
            for (let i = 0; i < proposalCount; i++) {
                let proposalData = await cfp.proposalData(proposals[i]);
                let sender = proposalData.sender;
                assert.equal(accounts[0], sender);
            }
        });
        it('debe rechazar propuestas que ya han sido registradas con registerProposal', async () => {
            await verifyThrows(async () => {
                await cfp.registerProposal(proposals[0]);
            }, /propuesta ya ha sido registrada/);
        });
        it('debe permitir que el creador use registerProposalFor', async () => {
            let proposal = gen.next();
            await cfp.registerProposalFor(proposal, accounts[1]);
            let proposalData = await cfp.proposalData(proposal);
            assert.equal(accounts[1], proposalData.sender);
        });
        it('no debe permitir que quien no es creador pueda usar registerProposalFor', async () => {
            await verifyThrows(async () => {
                await cfp.registerProposalFor(gen.next(), accounts[3], { from: accounts[2] })
            }, /el creador puede hacer esta llamada/);
        });
        it('debe permitir que quien no es creador pueda usar registerProposal', async () => {
            let proposal = gen.next();
            let sender = accounts[2];
            await cfp.registerProposal(proposal, { from: sender });
            let proposalData = await cfp.proposalData(proposal);
            assert.equal(sender, proposalData.sender);
        });
        it('debe rechazar propuestas que ya han sido registradas con  registerProposalFor', async () => {
            await verifyThrows(async () => {
                await cfp.registerProposalFor(proposals[1], accounts[1]);
            }, /propuesta ya ha sido registrada/);
        });
        it("debe emitir el evento ProposalRegistered al registrar con registerProposal", async () => {
            let proposal = gen.next();
            let tx = await cfp.registerProposal(proposal);
            let blockNumber = tx.receipt.blockNumber;
            checkEvent(tx, "ProposalRegistered", {
                proposal: proposal,
                blockNumber: blockNumber,
                sender: accounts[0]
            });
        });
        it("debe emitir el evento ProposalRegistered al registrar con registerProposalFor", async () => {
            let proposal = gen.next();
            let tx = await cfp.registerProposalFor(proposal, accounts[1]);
            let blockNumber = tx.receipt.blockNumber;
            let eventLog = undefined;
            for (let log of tx.logs) {
                if (log.event == "ProposalRegistered") {
                    eventLog = log;
                    break;
                }
            }
            assert(eventLog != undefined, "No se emitió el evento ProposalStamped");
            assert.equal(proposal, eventLog.args.proposal, "Evento con propuesta incorrecta");
            assert.equal(blockNumber, eventLog.args.blockNumber, "Evento con número de bloque incorrecto");
            assert.equal(accounts[1], eventLog.args.sender, "Evento con número de votantes incorrecto");
        });
        it('debe devolver información correcta para una propuesta no registrada', async () => {
            let proposal = gen.next();
            let proposalData = await cfp.proposalData(proposal);
            assert.equal(0, proposalData.blockNumber);
            assert.equal(0, proposalData.timestamp);
            assert.equal(emptyAddress, proposalData.sender);
            assert.equal(0, await cfp.proposalTimestamp(proposal));
        });
    });
    describe('Cierre de convocatoria', function () {
        it('debe rechazar propuestas enviadas después del cierre', async () => {
            let closingTime = now() + 2;
            let cfp = await CFP.new(gen.next(), closingTime);
            while (now() < closingTime + 2) {
                await new Promise(r => setTimeout(r, 1500))
            }
            await verifyThrows(async () => {
                await cfp.registerProposal(gen.next());
            }, "Convocatoria cerrada")
        })

    });
})