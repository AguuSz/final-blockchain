"""Server that provides an API for interacting with the CFPFactory contract."""

import argparse
import json
from datetime import datetime
import re
from web3 import Web3, HTTPProvider
from eth_account import Account
from eth_account.messages import encode_defunct
import messages
from flask import Flask, request, jsonify
from flask_cors import CORS
from pytz import timezone

# pylint: disable=W0718, E0601, E1120

app = Flask(__name__)
CORS(app)
w3 = Web3(HTTPProvider("HTTP://127.0.0.1:7545"))
CPF_FACTORY_FILE = "../contract/build/contracts/CFPFactory.json"
CFP_FILE = "../contract/build/contracts/CFP.json"

# Instancio el contrato CFPFactory
with open(CPF_FACTORY_FILE, encoding="utf-8") as f:
    cfp_factory = json.load(f)
    cfp_abi = cfp_factory["abi"]
    cfp_address = cfp_factory["networks"]["5777"]["address"]

    cfp_factory_contract = w3.eth.contract(address=cfp_address, abi=cfp_abi)


@app.post("/create")
def create():
    """
    Create a new contract.

    This endpoint is used to create a new contract by providing the necessary data in request body.

    Returns:
        A JSON response with a success message and code 201 if the contract is created successfully.
        A JSON response with an error message and code 400 or 403 if there are any validation errors
        A JSON response with an error message and code 500 if there is an internal server error.
    """

    if not is_valid_mimetype(request.mimetype):
        return (
            jsonify({"message": messages.INVALID_MIMETYPE}),
            400,
            {"Content-Type": "application/json"},
        )

    data = request.get_json()
    call_id = data["callId"]
    closing_time_data = data["closingTime"]
    signature = data["signature"]

    if not (
        all(c in "0123456789abcdefABCDEF" for c in signature[2:])
        and len(signature[2:]) == 130
    ):
        return (
            jsonify({"message": messages.INVALID_SIGNATURE}),
            400,
            {"Content-Type": "application/json"},
        )

    if not is_valid_call_id(call_id):
        return (
            jsonify({"message": messages.INVALID_CALLID}),
            400,
            {"Content-Type": "application/json"},
        )

    try:
        closing_time_data = datetime.fromisoformat(closing_time_data)
    except ValueError:
        return (
            jsonify({"message": messages.INVALID_TIME_FORMAT}),
            400,
            {"Content-Type": "application/json"},
        )

    message = f"{cfp_address}{call_id[2:]}"
    message_hex = Web3.to_hex(text=message)
    encoded_msg = encode_defunct(hexstr=message_hex)
    owner_address = w3.eth.account.recover_message(encoded_msg, signature=signature)

    owner_is_authorized = cfp_factory_contract.functions.isAuthorized(
        w3.to_checksum_address(owner_address.lower())
    ).call()

    if not owner_is_authorized:
        return (
            jsonify({"message": messages.UNAUTHORIZED}),
            403,
            {"Content-Type": "application/json"},
        )

    cfp = cfp_factory_contract.functions.calls(call_id).call()
    if does_exist(cfp[0]):
        return (
            jsonify({"message": messages.ALREADY_CREATED}),
            403,
            {"Content-Type": "application/json"},
        )
    if w3.eth.get_block("latest").timestamp >= closing_time_data.timestamp():
        return (
            jsonify({"message": messages.INVALID_CLOSING_TIME}),
            400,
            {"Content-Type": "application/json"},
        )

    try:
        cfp_factory_contract.functions.createFor(
            call_id, int(closing_time_data.timestamp()), owner_address
        ).transact({"from": owner.address})
    except Exception:
        return (
            jsonify({"message": messages.INTERNAL_ERROR}),
            500,
            {"Content-Type": "application/json"},
        )

    return jsonify({"message": messages.OK}), 201, {"Content-Type": "application/json"}


@app.post("/register")
def register():
    """
    Endpoint for user registration.

    This endpoint handles the registration of a user by verifying their address and signature.
    The user's address and signature are received in the request body as JSON data.

    Returns:
            A JSON response with a success message and code 200 if the registration is successful.
            A JSON response with an error message and code 400 if the request is invalid.
            A JSON response with an error message and code 403 if the user is already registered.
            A JSON response with an error message and code 500 if there is an internal server error.
    """

    if not is_valid_mimetype(request.mimetype):
        return (
            jsonify({"message": messages.INVALID_MIMETYPE}),
            400,
            {"Content-Type": "application/json"},
        )

    data = request.get_json()
    address = data["address"]
    signature = data["signature"]

    if not is_valid_address(address):
        return (
            jsonify({"message": messages.INVALID_ADDRESS}),
            400,
            {"Content-Type": "application/json"},
        )

    if not (
        all(c in "0123456789abcdefABCDEF" for c in signature[2:])
        and len(signature[2:]) == 130
    ):
        return (
            jsonify({"message": messages.INVALID_SIGNATURE}),
            400,
            {"Content-Type": "application/json"},
        )

    contract_address_hex = Web3.to_hex(text=cfp_address)
    encoded_msg = encode_defunct(hexstr=contract_address_hex)
    address_recovered = w3.eth.account.recover_message(encoded_msg, signature=signature)
    address = w3.to_checksum_address(address.lower())

    if address_recovered != address:
        return (
            jsonify({"message": messages.INVALID_SIGNATURE}),
            400,
            {"Content-Type": "application/json"},
        )

    is_registered = cfp_factory_contract.functions.isRegistered(
        w3.to_checksum_address(address)
    ).call()
    if is_registered:
        return (
            jsonify(
                {
                    "message": "El usuario ya se encuentra registrado. No se hacen cambios."
                }
            ),
            403,
            {"Content-Type": "application/json"},
        )

    try:
        cfp_factory_contract.functions.register().transact({"from": address})
    except Exception:
        return (
            jsonify({"message": messages.INTERNAL_ERROR}),
            500,
            {"Content-Type": "application/json"},
        )

    return jsonify({"message": messages.OK}), 200, {"Content-Type": "application/json"}


@app.post("/register-proposal")
def register_proposal():
    """
    Register a proposal for a specific call.

    Returns:
        A JSON response with a success message and code 201 if the proposal is registered.
        A JSON response with an error message and code 400, 403, 404, or 500 if there are any errors
    """
    if not is_valid_mimetype(request.mimetype):
        return (
            jsonify({"message": messages.INVALID_MIMETYPE}),
            400,
            {"Content-Type": "application/json"},
        )

    data = request.get_json()
    call_id = data["callId"]
    proposal = data.get("proposal")

    if call_id is None:
        return (
            jsonify({"message": messages.CALLID_NOT_FOUND}),
            404,
            {"Content-Type": "application/json"},
        )
    if not is_valid_call_id(call_id):
        return (
            jsonify({"message": messages.INVALID_CALLID}),
            400,
            {"Content-Type": "application/json"},
        )

    cfp = cfp_factory_contract.functions.calls(call_id).call()

    if not does_exist(cfp[0]):
        return (
            jsonify({"message": messages.CALLID_NOT_FOUND}),
            404,
            {"Content-Type": "application/json"},
        )
    if not is_valid_call_id(proposal):
        return (
            jsonify({"message": messages.INVALID_PROPOSAL}),
            400,
            {"Content-Type": "application/json"},
        )

    with open(CFP_FILE, encoding="utf-8") as cfp_file:
        cfp_data = json.load(cfp_file)
        abi = cfp_data["abi"]

        cfp_contract = w3.eth.contract(address=cfp[1], abi=abi)

    # Obtengo la data del cfp en cuestion
    proposal_data_data = cfp_contract.functions.proposalData(proposal).call()

    if does_exist(proposal_data_data[0]):
        return (
            jsonify({"message": messages.ALREADY_REGISTERED}),
            403,
            {"Content-Type": "application/json"},
        )

    # Luego de todas las validaciones, registramos la propuesta
    try:
        cfp_contract.functions.registerProposal(proposal).transact(
            {"from": owner.address}
        )
    except Exception as e:
        return (
            jsonify({"message": str(e)}),
            500,
            {"Content-Type": "application/json"},
        )

    return jsonify({"message": messages.OK}), 201, {"Content-Type": "application/json"}


@app.get("/pending-users")
def pending():
    """
    Get the list of pending users to approve after they registered.

    Returns:
        A JSON response containing the list of pending calls.
    """
    try:
        pending_users = cfp_factory_contract.functions.getAllPending().call()
    except Exception as e:
        return (
            jsonify({"message": str(e)}),
            500,
            {"Content-Type": "application/json"},
        )

    return (
        jsonify({"pendingUsers": pending_users}),
        200,
        {"Content-Type": "application/json"},
    )


@app.get("/authorized/<address>")
def authorized(address):
    """
    Retrieves the authorization status for a given address.

    Parameters:
    - address (str): The address to check authorization for.

    Returns:
    - dict: A JSON response containing the authorization status of the address.
    """
    if not is_valid_address(address):
        return (
            jsonify({"message": messages.INVALID_ADDRESS}),
            400,
            {"Content-Type": "application/json"},
        )

    response_body = cfp_factory_contract.functions.isAuthorized(
        w3.to_checksum_address(address)
    ).call()
    return (
        jsonify({"authorized": response_body}),
        200,
        {"Content-Type": "application/json"},
    )


@app.post("/authorize/<address>")
def authorize(address):
    """
    Authorizes the given address.

    Parameters:
    - address (str): The address to authorize.

    Returns:
    - response (json): A JSON response indicating the result of the authorization process.
    """
    if not is_valid_address(address):
        return (
            jsonify({"message": messages.INVALID_ADDRESS}),
            400,
            {"Content-Type": "application/json"},
        )

    is_authorized = cfp_factory_contract.functions.isAuthorized(
        w3.to_checksum_address(address)
    ).call()
    if is_authorized:
        return (
            jsonify({"message": messages.ALREADY_AUTHORIZED}),
            403,
            {"Content-Type": "application/json"},
        )

    try:
        cfp_factory_contract.functions.authorize(
            w3.to_checksum_address(address)
        ).transact({"from": owner.address})
    except Exception as e:
        return (
            jsonify({"message": str(e)}),
            500,
            {"Content-Type": "application/json"},
        )

    return jsonify({"message": messages.OK}), 200, {"Content-Type": "application/json"}


@app.post("/unauthorize/<address>")
def unauthorize(address):
    """
    Unauthorizes the given address.

    Parameters:
    - address (str): The address to unauthorize.

    Returns:
    - response (json): A JSON response indicating the result of the authorization process.
    """
    if not is_valid_address(address):
        return (
            jsonify({"message": messages.INVALID_ADDRESS}),
            400,
            {"Content-Type": "application/json"},
        )

    is_authorized = cfp_factory_contract.functions.isAuthorized(
        w3.to_checksum_address(address)
    ).call()
    if not is_authorized:
        return (
            jsonify(
                {
                    "message": "El usuario no se encuentra autorizado. No se hacen cambios."
                }
            ),
            403,
            {"Content-Type": "application/json"},
        )

    try:
        cfp_factory_contract.functions.authorize(
            w3.to_checksum_address(address)
        ).transact({"from": owner.address})
    except Exception as e:
        return (
            jsonify({"message": str(e)}),
            500,
            {"Content-Type": "application/json"},
        )

    return jsonify({"message": messages.OK}), 200, {"Content-Type": "application/json"}


@app.get("/calls")
def get_calls():
    """
    Retrieve the list of calls from the smart contract.

    Returns:
        A JSON response containing the list of calls.
    """
    try:
        calls = cfp_factory_contract.functions.callsList().call()
    except Exception as e:
        return (
            jsonify({"message": str(e)}),
            500,
            {"Content-Type": "application/json"},
        )

    calls_list = []
    for call in calls:
        calls_list.append(
            {
                "owner": call[0],
                "callCfp": call[1],
                "callId": call[2].hex(),
                "timestamp": call[3],
            }
        )
    return jsonify({"callsList": calls_list}), 200, {"Content-Type": "application/json"}


@app.get("/calls/<call_id>")
def get_call(call_id):
    """
    Retrieves information about a specific call.

    Parameters:
    - call_id (str): The ID of the call to retrieve information for.

    Returns:
    - response (tuple): A tuple containing the response JSON, status code, and headers.
    """
    if not is_valid_call_id(call_id):
        return (
            jsonify({"message": messages.INVALID_CALLID}),
            400,
            {"Content-Type": "application/json"},
        )

    # Obtengo el CFP
    cfp = cfp_factory_contract.functions.calls(call_id).call()

    if not does_exist(cfp[0]):
        return (
            jsonify({"message": messages.CALLID_NOT_FOUND}),
            404,
            {"Content-Type": "application/json"},
        )

    # Si pasa todo bien
    response = jsonify(
        {
            "creator": cfp[0],
            "cfp": cfp[1],
        }
    )
    return response, 200, {"Content-Type": "application/json"}


@app.get("/closing-time/<call_id>")
def closing_time(call_id):
    """
    Get the closing time for a given call ID.

    Parameters:
    - call_id (str): The ID of the call.

    Returns:
    - response (tuple): A tuple containing the JSON response, status code, and headers.
    """
    if not is_valid_call_id(call_id):
        return (
            jsonify({"message": messages.INVALID_CALLID}),
            400,
            {"Content-Type": "application/json"},
        )

    cfp = cfp_factory_contract.functions.calls(call_id).call()

    if not does_exist(cfp[0]):
        return (
            jsonify({"message": messages.CALLID_NOT_FOUND}),
            404,
            {"Content-Type": "application/json"},
        )

    # Necesito acceder al contrato CFP para obtener mas informacion
    with open(CFP_FILE, encoding="utf-8") as cfp_file:
        cfp_data = json.load(cfp_file)
        abi = cfp_data["abi"]

        cfp_contract = w3.eth.contract(address=cfp[1], abi=abi)

    closing_time_data = cfp_contract.functions.closingTime().call()
    closing_time_data = datetime.fromtimestamp(
        closing_time_data, timezone("America/Argentina/Buenos_Aires")
    )

    response = jsonify({"closingTime": closing_time_data.isoformat()})
    return response, 200, {"Content-Type": "application/json"}


@app.get("/contract-address")
def contract_address():
    """
    Get the contract address.

    Returns:
            A JSON response containing the contract address.
    """
    return jsonify({"address": cfp_address}), 200, {"Content-Type": "application/json"}


@app.get("/contract-owner")
def contract_owner():
    """
    Get the address of the contract owner.

    Returns:
            A JSON response containing the address of the contract owner.
    """
    return (
        jsonify({"address": owner.address}),
        200,
        {"Content-Type": "application/json"},
    )


@app.get("/proposal-data/<call_id>/<proposal>")
def proposal_data(call_id, proposal):
    """
    Retrieves data for a given call ID and proposal.

    Args:
            call_id (str): The call ID.
            proposal (str): The proposal ID.

    Returns:
            tuple: A tuple containing the response JSON, status code, and headers.
    """
    if not is_valid_call_id(call_id):
        return (
            jsonify({"message": messages.INVALID_CALLID}),
            400,
            {"Content-Type": "application/json"},
        )

    cfp = cfp_factory_contract.functions.calls(call_id).call()

    if not does_exist(cfp[0]):
        return (
            jsonify({"message": messages.CALLID_NOT_FOUND}),
            404,
            {"Content-Type": "application/json"},
        )
    if not is_valid_call_id(proposal):
        return (
            jsonify({"message": messages.INVALID_PROPOSAL}),
            400,
            {"Content-Type": "application/json"},
        )

    # Connect to the CFP contract to retrieve the data
    with open(CFP_FILE, encoding="utf-8") as cfp_file:
        cfp_data = json.load(cfp_file)
        abi = cfp_data["abi"]

        cfp_contract = w3.eth.contract(address=cfp[1], abi=abi)

    # Call the internal function of the contract
    proposal_data_data = cfp_contract.functions.proposalData(proposal).call()

    # If the proposal does not exist, return a 404
    if not does_exist(proposal_data_data[0]):
        return (
            jsonify({"message": messages.PROPOSAL_NOT_FOUND}),
            404,
            {"Content-Type": "application/json"},
        )

    closing_time_data = datetime.fromtimestamp(
        proposal_data_data[2], timezone("America/Argentina/Buenos_Aires")
    )
    response = jsonify(
        {
            "timestamp": closing_time_data.isoformat(),
            "sender": str(proposal_data_data[0]),
            "blockNumber": proposal_data_data[1],
        }
    )
    return response, 200, {"Content-Type": "application/json"}


# ----------------------------------------------------------------


def does_exist(element):
    """
    Check if the given element exists.

    Parameters:
    element (str): The element to check.

    Returns:
    bool: True if the element exists, False otherwise.
    """
    return element != "0x0000000000000000000000000000000000000000"


def is_valid_mimetype(mimetype):
    """
    Check if the given mimetype is valid.

    Args:
        mimetype (str): The mimetype to check.

    Returns:
        bool: True if the mimetype is "application/json", False otherwise.
    """
    return mimetype == "application/json"


def is_valid_address(address):
    """
    Check if the given address is a valid Ethereum address.

    Args:
        address (str): The address to be checked.

    Returns:
        bool: True if the address is valid, False otherwise.
    """
    return re.match(r"^0x[a-fA-F0-9]{40}$", address)


def is_valid_call_id(call_id):
    """
    Check if a given call ID is valid.

    Parameters:
    - call_id (str): The call ID to be validated.

    Returns:
    - bool: True if the call ID is valid, False otherwise.
    """
    # Si no es un string o no empieza con 0x, no es un hash valido
    if not isinstance(call_id, str) or not call_id.startswith("0x"):
        return False

    # Si no matchea con el regex (alfanumerico y de 64 caracteres), no es un hash valido
    return re.match(r"^0x[0-9a-fA-F]{64}$", call_id)


def is_valid_mnemonic(mnemonic_value):
    """
    Checks if a given mnemonic is valid.

    Args:
        mnemonic_value (str): The mnemonic to be checked.

    Returns:
        bool: True if the mnemonic is valid (contains exactly 12 words), False otherwise.
    """
    return len(mnemonic_value.split()) == 12


# ----------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mnemonic_file", help="Path to the file containing the mnemonic"
    )
    args = parser.parse_args()

    try:
        # Read the mnemonic from the file
        with open(args.mnemonic_file, "r", encoding="utf-8") as file:
            mnemonic = file.read().strip()

        # Verificamos que la semilla sea valida
        if not is_valid_mnemonic(mnemonic):
            raise ValueError(
                "La semilla no es válida"
            )  # Changed exception type and error message
        Account.enable_unaudited_hdwallet_features()

        # Generamos la cuenta del propietario
        owner = Account.from_mnemonic(mnemonic, account_path="m/44'/60'/0'/0/0")
        print("Owner address: ", owner.address)

        # Levantamos el server
        app.run(debug=True)

    except ValueError as error:
        print("Se ha producido un error", error)
