from odoo import http
from odoo.http import request
from ..setup.jwt_token import JwtToken
import json,jwt
from odoo.modules.registry import Registry
import odoo.api
from odoo import SUPERUSER_ID


class ApiAuth(http.Controller):

    @http.route('/api/authenticate', type='json', auth='none', methods=['POST'], csrf=False)
    def authenticate_post(self, **kwargs):
        try:
            raw_data = request.httprequest.data
            params = json.loads(raw_data.decode("utf-8")) if raw_data else {}
        except Exception:
            params = {}

        if "params" in params:
            params = params.get("params", {})

        login    = params.get('login')
        password = params.get('password')
        api_key  = params.get('api_key')
        db_name  = request.db or params.get('db') or request.session.db

        if not db_name:
            return {"error": "Could not determine database"}

        uid = None

        try:
            registry = Registry(db_name)
            with registry.cursor() as cr:
                env = odoo.api.Environment(cr, SUPERUSER_ID, {})

                if api_key:
                    uid = env['res.users.apikeys']._check_credentials(
                        scope='rpc', key=api_key
                    )
                    if not uid:
                        return {"error": "Invalid API key"}

                elif login and password:
                    credential = {'login': login, 'password': password, 'type': 'password'}
                    result = env['res.users']._login(db_name, credential, {'interactive': False})
                    uid = result.get('uid') if isinstance(result, dict) else result
                    if not uid:
                        return {"error": "Invalid login or password"}

                else:
                    return {"error": "Please provide login/password or api_key"}

        except Exception as e:
            return {"error": "Authentication failed: {}".format(str(e))}

        try:
            access_token  = JwtToken.generate_token(uid)
            refresh_token = JwtToken.create_refresh_token(request, uid)
            rotation_period = JwtToken.REFRESH_TOKEN_SECONDS * 3/4
            res_data = {
                'rotation_period': rotation_period,
                'token': access_token,
                'user_id': uid,
                'long_term_token_span': JwtToken.REFRESH_TOKEN_SECONDS,
                'short_term_token_span': JwtToken.ACCESS_TOKEN_SECONDS,
            }
            if not request.httprequest.user_agent.browser:
                res_data['refreshToken'] = refresh_token
            return res_data
        except Exception as exc:
            return {"error": str(exc)}

    @http.route('/api/update/access-token', type='json', auth='none', csrf=False)
    def updated_short_term_token(self, **kwargs):
        params = self.__class__.get_json_params()
        if not params.get('user_id'):
            return {'error': 'User id not given'}
        user_id = int(params.get('user_id'))
        long_term_token = self.__class__.get_refresh_token(request)
        JwtToken.varify_refresh_token(request, user_id, long_term_token)
        new_token = JwtToken.generate_token(user_id)
        return {'access_token': new_token }

    # will be called after for rotation of long term refresh-tokens from client (if rotation_period>=0)
    @http.route('/api/update/refresh-token', type='json', auth='jwt', methods=['POST'], csrf=False)
    def updated_long_term_token(self, **kwargs):
        params = self.__class__.get_json_params()
        user_id = params.get('user_id')
        user_id = int(user_id)
        old_token = self.get_refresh_token(request)
        JwtToken.varify_refresh_token(request, user_id, old_token)
        new_token = JwtToken.create_refresh_token(request, user_id)
        res_data = {'status': 'done'}
        is_browser = request.httprequest.user_agent.browser
        if not is_browser:
            res_data['refreshToken'] = new_token
        else:
            res_data['refreshToken'] = 1
            request.future_response.set_cookie('refreshToken', new_token, httponly=True, secure=True, samesite='Lax')
        return res_data

    @http.route('/api/revoke/token', type='json', auth='jwt', methods=['POST'], csrf=False)
    def revoke_api_token(self, **kwargs):
        params = self.__class__.get_json_params()
        user_id = params.get('user_id')
        user_id = int(user_id)
        tok_ob = request.env['jwt.refresh_token'].sudo().search([('user_id', '=', user_id)])
        # will update the access token, so will become inaccessible immediately
        long_term_token = self.get_refresh_token(request)
        JwtToken.varify_refresh_token(request, user_id, long_term_token)
        tok_ob.is_revoked = True
        return {'status': 'success', 'logged_out': 1}

    @http.route('/api/protected/test', type='json', auth='jwt', methods=['POST'], csrf=False)
    def protected_users_json(self):
        uob = request.env.user
        users = [{'id': 1, 'name': 'sami3'}]
        user_data = [{'id': user['id'], 'name': user['name']} for user in users]
        return {'uid': uob.id, 'data': user_data}

    @classmethod
    def get_refresh_token(cls, req_obj):
        key_name = 'refreshToken'
        http_req = req_obj.httprequest
        long_term_token = http_req.cookies.get(key_name)
        if not long_term_token:
            long_term_token = http_req.headers.get(key_name)
        return long_term_token

    @classmethod
    def get_json_params(cls):
        http_req = request.httprequest
        params = {}
        if hasattr(http_req, 'json'):
            params = http_req.json or {}
        if not (len(params.keys())):
            if hasattr(request, 'params'):
                params = request.params or {}
        return params
    

    @http.route('/api/actions', type='json', auth='jwt', methods=['POST'], csrf=False)
    def do_action(self):  
        try:
            params = request.params or {}
            
            module = params.get("module", "").upper()
            action = params.get("action", "").upper()
            data = params.get("data", {})
            
            res = {}
            if module == "MINT_REQUEST":
                res = request.env['smr.minted.tokens'].sudo().doAction(action, data)
            
            out = { 
                "status": "success",
                "message": "",
                "module": module,
                "action": action,
                "data": res 
            }
            return out
        
        except jwt.ExpiredSignatureError:
            out = { 
                "status": "fail", 
                "message": "Login Expired" 
            }
            return out
        
        except Exception as ex:
            out = { 
                "status": "fail", 
                "message": "An error occurred: {}".format(str(ex)) 
            }
            return out