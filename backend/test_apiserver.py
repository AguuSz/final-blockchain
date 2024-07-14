"""Casos de prueba para el servidor de APIs."""
from datetime import datetime
from os import urandom
from random import randrange
from typing import Optional, Union

import requests
from dateutil.parser import isoparse
from dateutil.relativedelta import relativedelta
from dateutil.tz import gettz
from eth_account import Account
from eth_account.messages import SignableMessage, encode_defunct
from jsonschema import validate

import messages

calls_schema = {
    "type": "object",
    "properties": {
        "creator": {"type": "string"},
        "cfp": {"type": "string"},
    },
    "required": ["creator", "cfp"]
}

proposal_data_schema = {
    "type": "object",
    "properties": {
        "timestamp": {"type": "string"},
        "sender": {"type": "string"},
        "blockNumber": {
            "anyOf": [
                {"type": "number"},
                {"type": "string"}
            ]
        },
    },
    "required": ["sender", "blockNumber", "timestamp"]
}


def single_field_schema(field, field_type="string"):
    """Genera un esquema de validación de un solo campo."""
    return {
        "type": "object",
        "properties": {
            f"{field}": {"type": f"{field_type}"},
        },
        "required": [f"{field}"]
    }


message_schema = single_field_schema("message")
authorized_schema = single_field_schema("authorized", "boolean")
closing_time_schema = single_field_schema("closingTime")
address_schema = single_field_schema("address")

ART = gettz("GMT-3")
SERVER = "http://127.0.0.1:5000"
APPLICATION_JSON = "application/json"
accounts = []
calls = {}


def url(action: str, arg: Optional[str] = None) -> str:
    """Genera una URL para una acción y un argumento opcional."""
    return f"{SERVER}/{action}/{arg}" if arg else f"{SERVER}/{action}"


def random_hex(length: int) -> str:
    """Genera una string hexadecimal aleatoria de la longitud dada."""
    return f"0x{urandom(length).hex()}"


def random_hash() -> str:
    """Genera un hash aleatorio."""
    return random_hex(32)


def random_address() -> str:
    """Genera una dirección aleatoria."""
    return random_hex(20)


def random_signature() -> str:
    """Genera una firma aleatoria."""
    return random_hex(65)


def get_closing_time(past:bool=False) -> datetime:
    """Genera una fecha aleatoria en el futuro o pasado."""
    days:int = 1 + randrange(90)
    if past:
        days = -days
    hour:int = randrange(8, 18)
    return datetime.now(ART) + relativedelta(
        days=days,
        hour=hour,
        minute=0,
        second=0,
        microsecond=0)

def get_contract_address() -> str:
    """Obtiene la dirección del contrato."""
    response = requests.get(url("contract-address"), timeout=3)
    assert APPLICATION_JSON in response.headers['Content-type']
    assert response.status_code == 200
    validate(instance=response.json(), schema=address_schema)
    return response.json()["address"]

def get_contract_owner() -> str:
    """Obtiene la dirección del dueño del contrato."""
    response = requests.get(url("contract-owner"), timeout=3)
    assert APPLICATION_JSON in response.headers['Content-type']
    assert response.status_code == 200
    validate(instance=response.json(), schema=address_schema)
    return response.json()["address"]


def sign(message: str, account: Account) -> str:
    """Firma un mensaje desde la cuenta especificada."""
    signable_message: SignableMessage = encode_defunct(hexstr=message)
    return account.sign_message(signable_message).signature.hex()

def post_create(account: Account, call_id, closing_time: Union[datetime,str]):
    """Crea una llamada a propuestas."""
    contract_address = get_contract_address()
    message_bytes = bytes.fromhex(contract_address[2:]) + bytes.fromhex(call_id[2:])
    signature = sign(message_bytes.hex(), account)
    if isinstance(closing_time, datetime):
        closing_time = closing_time.isoformat()
    return requests.post(
        url("create"),
        json={
            "callId": call_id,
            "signature": signature,
            "closingTime": closing_time},
        timeout=10)

def post_register(address, signature):
    """Registra una dirección."""
    return requests.post(
        url("register"),
        json={
            "address": address,
            "signature": signature},
        timeout=10)

def post_register_proposal(call_id, proposal):
    """Registra una propuesta."""
    return requests.post(
        url("register-proposal"),
        json={
            "callId": call_id,
            "proposal": proposal},
        timeout=10)

def get_proposal_data(call_id, proposal):
    """Obtiene los datos de una propuesta."""
    return requests.get(
        url("proposal-data", f"{call_id}/{proposal}"), 
        timeout=3)

def test_authorized_unknown_address() -> None:
    """Prueba que una dirección desconocida no esté autorizada."""
    for _ in range(10):
        response = requests.get(url("authorized", random_address()), timeout=3)
        assert APPLICATION_JSON in response.headers['Content-type']
        assert response.status_code == 200
        validate(instance=response.json(), schema=authorized_schema)
        assert response.json()["authorized"] is False


def test_authorized_invalid_address() -> None:
    """Prueba que una dirección inválida no esté autorizada."""
    addresses = ["x", "0", "0x", "0x0", random_address()[:-1], random_address()[:-2], random_hash()]
    for address in addresses:
        response = requests.get(url("authorized", address), timeout=3)
        assert APPLICATION_JSON in response.headers['Content-type']
        assert response.status_code == 400
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"].startswith(messages.INVALID_ADDRESS)


def test_register() -> None:
    """Prueba el registro de una dirección."""
    contract_address = get_contract_address()
    for _ in range(10):
        account = Account().create()
        signature = sign(contract_address, account)
        response = post_register(account.address, signature)
        assert response.status_code == 200
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"] == messages.OK
        accounts.append(account)


def test_register_again() -> None:
    """Prueba que una dirección ya registrada no pueda registrarse de nuevo."""
    assert len(accounts) > 0
    contract_address = get_contract_address()
    for account in accounts:
        signature = sign(contract_address, account)
        response = post_register(account.address, signature)
        assert response.status_code == 403
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"].startswith(
            messages.ALREADY_AUTHORIZED)


def test_register_invalid_address() -> None:
    """Prueba que una dirección inválida no pueda registrarse."""
    signature = random_signature()
    addresses = ["x", "0", "0x", "0x0", random_address()[:-1], random_address()[:-2], random_hash()]
    for address in addresses:
        response = post_register(address, signature)
        assert APPLICATION_JSON in response.headers['Content-type']
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"].startswith(messages.INVALID_ADDRESS)
        assert response.status_code == 400


def test_register_invalid_signature() -> None:
    """Prueba que una dirección con una firma inválida no pueda registrarse."""
    assert len(accounts) > 1
    contract_address = get_contract_address()
    for account in accounts[1:]:
        signature = sign(contract_address, accounts[0])
        response = post_register(account.address, signature)
        assert APPLICATION_JSON in response.headers['Content-type']
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"].startswith(
            messages.INVALID_SIGNATURE)
        assert response.status_code == 400
    invalid = [ random_hash(), random_address(), random_hex(32), random_hex(64), "signature" ]
    account = Account().create()
    for signature in invalid:
        response = post_register(account.address, signature)
        assert APPLICATION_JSON in response.headers['Content-type']
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"].startswith(
            messages.INVALID_SIGNATURE)
        assert response.status_code == 400


def test_authorized() -> None:
    """Prueba que una dirección registrada esté autorizada."""
    assert len(accounts) > 0
    for account in accounts:
        response = requests.get(url("authorized", account.address), timeout=3)
        assert APPLICATION_JSON in response.headers['Content-type']
        assert response.status_code == 200
        validate(instance=response.json(), schema=authorized_schema)
        assert response.json()["authorized"]


def test_register_invalid_mimetype() -> None:
    """Prueba que el registro con un tipo de contenido inválido falle."""
    account = Account().create()
    signature = sign(account.address, account)
    response = requests.post(
        url("register"),
        data={
            "address": account.address,
            "signature": signature},
        timeout=10)
    assert APPLICATION_JSON in response.headers['Content-type']
    validate(instance=response.json(), schema=message_schema)
    assert response.status_code == 400
    assert response.json()["message"].startswith(messages.INVALID_MIMETYPE)


def test_create_unauthorized() -> None:
    """Prueba que una dirección no registrada no pueda crear una llamada."""
    account = Account().create()
    call_id = random_hash()
    closing_time = get_closing_time()
    response = post_create(account, call_id, closing_time)
    assert APPLICATION_JSON in response.headers['Content-type']
    validate(instance=response.json(), schema=message_schema)
    assert response.json()["message"].startswith(messages.UNAUTHORIZED)
    assert response.status_code == 403

def test_create_invalid_signature() -> None:
    """Prueba que una dirección con una firma inválida no pueda crear una llamada."""
    closing_time = get_closing_time()
    invalid = [random_hash(), random_address(), random_hex(64), "signature"]
    for signature in invalid:
        response = requests.post(
            url("create"),
            json={
                "callId": random_hash(),
                "signature": signature,
                "closingTime": closing_time.isoformat()},
            timeout=10)
        assert APPLICATION_JSON in response.headers['Content-type']
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"].startswith(messages.INVALID_SIGNATURE)
        assert response.status_code == 400

def test_create_invalid_mimetype() -> None:
    """Prueba que la creación de una propuesta con un tipo de contenido inválido falle."""
    account = Account().create()
    call_id = random_hash()
    contract_address = get_contract_address()
    message_bytes = bytes.fromhex(contract_address[2:]) + bytes.fromhex(call_id[2:])
    signature = sign(message_bytes.hex(), account)
    response = requests.post(
        url("create"),
        data={
            "callId": random_hash(),
            "signature": signature,
            "closingTime": get_closing_time().isoformat()},
        timeout=10)
    assert APPLICATION_JSON in response.headers['Content-type']
    validate(instance=response.json(), schema=message_schema)
    assert response.status_code == 400
    assert response.json()["message"].startswith(messages.INVALID_MIMETYPE)

def test_create() -> None:
    """Prueba que una dirección registrada pueda crear una llamada."""
    assert len(accounts) > 0
    for account in accounts:
        call_id = random_hash()
        closing_time = get_closing_time()
        response = post_create(account, call_id, closing_time)
        assert APPLICATION_JSON in response.headers['Content-type']
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"] == messages.OK
        assert response.status_code == 201
        calls[call_id] = {"creator": account.address,
                          "closingTime": closing_time}


def test_create_invalid_call_id() -> None:
    """Prueba que una llamada con un identificador inválido falle."""
    invalid = ["00ab", "0xab", "0x00", random_hash()[:-2], random_address()]
    for call_id in invalid:
        closing_time = get_closing_time()
        response = post_create(accounts[0], call_id, closing_time)
        assert APPLICATION_JSON in response.headers['Content-type']
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"].startswith(
            messages.INVALID_CALLID)
        assert response.status_code == 400

def test_create_invalid_time_format() -> None:
    """Prueba que una llamada con un formato de tiempo inválido falle."""
    invalid = ["x", "0", "0x", "2030-13-13", random_address(), random_hash()]
    for closing_time in invalid:
        call_id = random_hash()
        response = post_create(accounts[0], call_id, closing_time)
        assert APPLICATION_JSON in response.headers['Content-type']
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"].startswith(
            messages.INVALID_TIME_FORMAT)
        assert response.status_code == 400

def test_create_invalid_closing_time() -> None:
    """Prueba que una llamada con un tiempo de cierre inválido falle."""
    assert len(accounts) > 0
    for account in accounts:
        call_id = random_hash()
        closing_time = get_closing_time(True)
        response = post_create(account, call_id, closing_time)
        assert APPLICATION_JSON in response.headers['Content-type']
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"].startswith(messages.INVALID_CLOSING_TIME)
        assert response.status_code == 400

def test_already_created() -> None:
    """Prueba que una llamada ya creada no pueda crearse de nuevo."""
    assert len(calls) > 0
    for call_id in calls:
        closing_time = get_closing_time()
        response = post_create(accounts[0], call_id, closing_time)
        assert APPLICATION_JSON in response.headers['Content-type']
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"].startswith(messages.ALREADY_CREATED)
        assert response.status_code == 403


def test_calls() -> None:
    """Prueba que los datos de una llamada creada sean correctos."""
    assert len(calls) > 0
    for call_id, data in calls.items():
        response = requests.get(url("calls", call_id), timeout=3)
        assert APPLICATION_JSON in response.headers['Content-type']
        assert response.status_code == 200
        validate(instance=response.json(), schema=calls_schema)
        assert response.json()["creator"] == data["creator"]
        data["cfp"] = response.json()["cfp"]
    response = requests.get(url("calls", random_hash()), timeout=3)
    assert APPLICATION_JSON in response.headers['Content-type']
    assert response.status_code == 404
    validate(instance=response.json(), schema=message_schema)
    assert response.json()["message"].startswith(messages.CALLID_NOT_FOUND)
    invalid = ["00ab", "0xab", "0x00", random_hash()[:-2], random_address()]
    for call_id in invalid:
        response = requests.get(url("calls", call_id), timeout=3)
        assert APPLICATION_JSON in response.headers['Content-type']
        assert response.status_code == 400
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"].startswith(messages.INVALID_CALLID)


def test_created_closing_time() -> None:
    """Prueba que el tiempo de cierre de una llamada creada sea correcto."""
    assert len(calls) > 0
    for call_id, data in calls.items():
        response = requests.get(url("closing-time", call_id), timeout=3)
        assert APPLICATION_JSON in response.headers['Content-type']
        assert response.status_code == 200
        validate(instance=response.json(), schema=closing_time_schema)
        closing_time = isoparse(response.json()["closingTime"])
        assert closing_time == data["closingTime"]
    response = requests.get(url("closing-time", random_hash()), timeout=3)
    assert APPLICATION_JSON in response.headers['Content-type']
    assert response.status_code == 404
    validate(instance=response.json(), schema=message_schema)
    assert response.json()["message"].startswith(messages.CALLID_NOT_FOUND)
    invalid = ["00ab", "0xab", "0x00", random_hash()[:-2], random_address()]
    for call_id in invalid:
        response = requests.get(url("closing-time", call_id), timeout=3)
        assert APPLICATION_JSON in response.headers['Content-type']
        assert response.status_code == 400
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"].startswith(messages.INVALID_CALLID)


def test_contract_address() -> None:
    """Prueba que devuelva la dirección del contrato."""
    get_contract_address()

def test_contract_owner() -> None:
    """Prueba que devuelva la dirección del propietario del contrato."""
    get_contract_owner()


def test_register_proposal() -> None:
    """Prueba que una dirección registrada pueda registrar una propuesta una sola vez."""
    assert len(calls) > 0
    block_number = 0
    timestamp = 0
    for call_id in calls:
        proposal = random_hash()
        response = post_register_proposal(call_id, proposal)
        assert APPLICATION_JSON in response.headers['Content-type']
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"] == messages.OK
        assert response.status_code == 201
        response = get_proposal_data(call_id, proposal)
        assert APPLICATION_JSON in response.headers['Content-type']
        validate(instance=response.json(), schema=proposal_data_schema)
        assert response.status_code == 200
        assert response.json()["sender"] == get_contract_owner()
        new_block_number = response.json()["blockNumber"]
        assert isinstance(new_block_number, int)
        assert new_block_number > 0 and new_block_number > block_number
        block_number = new_block_number
        new_timestamp = isoparse(response.json()["timestamp"]).timestamp()
        assert new_timestamp > 0 and new_timestamp >= timestamp
        timestamp = new_timestamp
        response = post_register_proposal(call_id, proposal)
        assert APPLICATION_JSON in response.headers['Content-type']
        validate(instance=response.json(), schema=message_schema)
        assert response.status_code == 403
        assert response.json()["message"].startswith(messages.ALREADY_REGISTERED)

def test_register_proposal_invalid_mimetype() -> None:
    """Prueba que una dirección registrada no pueda registrar una propuesta con un mimetype inválido."""
    assert len(calls) > 0
    for call_id in calls:
        proposal = random_hash()
        response = requests.post(
            url("register-proposal"),
            data={
                "callId": call_id,
                "proposal": proposal},
            timeout=10)
        assert APPLICATION_JSON in response.headers['Content-type']
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"].startswith(messages.INVALID_MIMETYPE)
        assert response.status_code == 400


def test_register_proposal_invalid_call() -> None:
    """Prueba que una dirección registrada no pueda registrar una propuesta en una llamada inexistente."""
    proposal = random_hash()
    call_id = random_hash()
    response = post_register_proposal(call_id, proposal)
    assert APPLICATION_JSON in response.headers['Content-type']
    validate(instance=response.json(), schema=message_schema)
    assert response.json()["message"].startswith(messages.CALLID_NOT_FOUND)
    assert response.status_code == 404
    invalid = ["x", "0x", "0x0", random_address()]
    for call_id in invalid:
        proposal = random_hash()
        response = post_register_proposal(call_id, proposal)
        assert APPLICATION_JSON in response.headers['Content-type']
        validate(instance=response.json(), schema=message_schema)
        assert response.status_code == 400
        assert response.json()["message"].startswith(messages.INVALID_CALLID)

def test_register_proposal_invalid_proposal() -> None:
    """Prueba que una dirección registrada no pueda registrar una propuesta inválida."""
    assert len(calls) > 0
    for call_id in calls:
        invalid = ["x", "0x", "0x0", random_address()]
        for proposal in invalid:
            response = post_register_proposal(call_id, proposal)
            assert APPLICATION_JSON in response.headers['Content-type']
            validate(instance=response.json(), schema=message_schema)
            assert response.status_code == 400
            assert response.json()["message"].startswith(messages.INVALID_PROPOSAL)

def test_proposal_data_invalid_input() -> None:
    """Prueba que no se pueda obtener la información de una propuesta con un input inválido."""
    assert len(calls) > 0
    for call_id in calls:
        proposal = random_hash()
        response = get_proposal_data(call_id, proposal)
        assert APPLICATION_JSON in response.headers['Content-type']
        validate(instance=response.json(), schema=message_schema)
        assert response.json()["message"] == messages.PROPOSAL_NOT_FOUND
        assert response.status_code == 404
        invalid = ["x", "0x", "0x0", random_address()]
        for invalid_hash in invalid:
            response = get_proposal_data(call_id, invalid_hash)
            assert APPLICATION_JSON in response.headers['Content-type']
            validate(instance=response.json(), schema=message_schema)
            assert response.status_code == 400
            assert response.json()["message"].startswith(messages.INVALID_PROPOSAL)
            response = get_proposal_data(invalid_hash, random_hash())
            assert APPLICATION_JSON in response.headers['Content-type']
            validate(instance=response.json(), schema=message_schema)
            assert response.status_code == 400
            assert response.json()["message"].startswith(messages.INVALID_CALLID)
    response = get_proposal_data(random_hash(), random_hash())
    assert APPLICATION_JSON in response.headers['Content-type']
    validate(instance=response.json(), schema=message_schema)
    assert response.status_code == 404
    assert response.json()["message"].startswith(messages.CALLID_NOT_FOUND)