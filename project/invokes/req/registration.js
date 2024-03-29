'use strict'
const fs = require('fs')
const core = require('../../scripts/core')
const consts = require('../../scripts/consts')
const path = require('path')
const crypto = require('crypto')
const users = require('../../scripts/users')
const unconfirmed = require('../../scripts/unconfirmed')
const mail = require('../../scripts/mail')
const rcodes = require(consts.RCODES_PATH)
            
const reg = async (request, response, data) => {
	if (users.getCurrentUser(request)) {
		core.sendJSON(response, {err: rcodes.AUTHORIZED_ALREADY})
		return
	}
	
	let args
	
	try {
		args = JSON.parse(data)
	} catch (err) {
		core.sendJSON(response, {err: rcodes.JSON_SYNTAX_ERROR})
		return
	}
	
	if (!args.email || !args.username || !args.password) {
		core.sendJSON(response, {err: rcodes.JSON_SYNTAX_ERROR})
		return
	}
		
    if (await users.getUserLogin(args.email)) {
    	if (await users.getUserAccept(args.username))
    		core.sendJSON(response, {err: rcodes.EMAIL_AND_USERNAME_ALREADY_EXISTS})
    	else
    		core.sendJSON(response, {err: rcodes.EMAIL_ALREADY_EXISTS})
    	return
    }
    
    if (await users.getUserAccept(args.username)) {
		core.sendJSON(response, {err: rcodes.USERNAME_ALREADY_EXISTS})
		return
    }
    
    const hash = await unconfirmed.addUserInUnconfirmed(args.email, args.username, args.password)
    
    try {
    	await mail.sendMail(args.email, 'QuickChat registration!',
     		 'Please follow the link below \n\n'+"http://"+request.headers.host+"/approve?hash="+hash)
    } catch (err) {
    	await unconfirmed.deleteUserFromUnconfirmed(hash)
    	core.sendJSON(response, {err: rcodes.FAILED_TO_SEND_EMAIL})
    	return
    }
    
    await users.setCurrentUser(response, args.username)
	core.sendJSON(response, {err: rcodes.SUCCESS})
}

exports.invoke = reg 