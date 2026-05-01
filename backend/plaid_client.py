import os
from plaid.api import plaid_api
from plaid.configuration import Configuration
from plaid.api_client import ApiClient

PLAID_ENV_URLS = {
    'sandbox': 'https://sandbox.plaid.com',
    'development': 'https://development.plaid.com',
    'production': 'https://production.plaid.com',
}

def _build_client() -> plaid_api.PlaidApi:
    env = os.getenv('PLAID_ENV', 'sandbox')
    host = PLAID_ENV_URLS.get(env, PLAID_ENV_URLS['sandbox'])
    configuration = Configuration(
        host=host,
        api_key={
            'clientId': os.getenv('PLAID_CLIENT_ID', ''),
            'secret': os.getenv('PLAID_SECRET', ''),
        }
    )
    return plaid_api.PlaidApi(ApiClient(configuration))

client = _build_client()
