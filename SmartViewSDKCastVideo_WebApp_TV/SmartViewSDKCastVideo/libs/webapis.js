(function(window) {
	window.webapis = window.webapis || {};

	var ppPluginCount = 0; // ppPluginCount is used to identify each plugin instance
	function PepperPlugin(name) {
		this.name = name;
		var pluginID = "_ppapi_plugin_" + name + "_" + (ppPluginCount++);
		var plugin = document.createElement("EMBED");
		plugin.id = "_ppapi_plugin_" + name + "_div";
		//plugin.type = "application/x-ppapi-" + name;
		plugin.src = "external-module:" + name + "/" + name;
		plugin.style.position = "absolute";
		plugin.style.left = "0px";
		plugin.style.top = "0px";
		plugin.style.width = "0px";
		plugin.style.height = "0px";
		document.body.appendChild(plugin);

		this.elPlugin = plugin;
		this.messageHandlers = {};
		this.listenerHandlers = {};

		this.elPlugin.addEventListener('message', this.handleMessage.bind(this), true);
	}

	PepperPlugin.prototype.handleMessage = function(message) {
		if (typeof message.data == "undefined") {
			console.log("[webapi.js] message.data is undefined. ");
			return;
		}
		var msgData = message.data;

		if (typeof msgData.command != "undefined") {
			
			if(typeof msgData.callId != "undefined"){
				// Have callId callback
				var cbArr = this.getCallbacksById(msgData.command, msgData.callId);
				console.log("[webapi.js]Have callId cbArr length: " + cbArr.length);
				for ( var i = 0; i < cbArr.length; i++) {
					cbArr[i].call(this, message);
				}
				this.removeCallbackById(msgData.command, msgData.callId);
			}
			else{
				// command callback
				var cbArr = this.getCallbacksByCommand(msgData.command);
				console.log("[webapi.js] cbArr length: " + cbArr.length);
				for ( var i = 0; i < cbArr.length; i++) {
					cbArr[i].call(this, message);
				}
				this.removeCallbacksByCommand(msgData.command);
			}
		} else if (typeof msgData.event != "undefined") {
			// event listener
			var eventArr = this.getListenersByEvent(msgData.event);
			console.log("[webapi.js] eventArr length: " + eventArr.length);
			for ( var i = 0; i < eventArr.length; i++) {
				eventArr[i].call(this, message);
			}
		} else {
			console.log("[webapi.js] unknown message type.");
		}
	};

	PepperPlugin.prototype.postMessage = function(cmdObj, callback) {
		var cbId = this.registerCallback(cmdObj.command, callback);

		// kookheon.kim@samsung.com
		// If defining custom property "callId" would be possible and the
		// "callId" is passed to "message" event handler's parameter,
		// we can distinguish each callbacks that having same command. I'm not
		// sure if this is possible.
		cmdObj.callId = cbId;
		this.elPlugin.postMessage(cmdObj);
		return cbId;
	};

	PepperPlugin.prototype.postMessageAndAwaitResponse = function(cmdObj) {
		return this.elPlugin.postMessageAndAwaitResponse(cmdObj);
	};

	// shared among PepperPlugin instances. No reason for sharing and just for
	// simple implementation.
	var registerCount = 0;
	PepperPlugin.prototype.registerCallback = function(command, callback) {
		var cbId = registerCount++;
		// this.messageHandlers[cmdObj.command] = this.messageHandlers[cmdObj.command] || {};
		// this.messageHandlers[cmdObj.command][cbId] = callback;
		this.messageHandlers[command] = this.messageHandlers[command] || {};
		this.messageHandlers[command][cbId] = callback;
		return cbId;
	};
	PepperPlugin.prototype.getCallbacksByCommand = function(command) {
		var cbarr = [];
		if (!this.messageHandlers.hasOwnProperty(command))
			return false;
		for ( var id in this.messageHandlers[command]) {
			cbarr.push(this.messageHandlers[command][id]);
		}
		return cbarr;
	};
	PepperPlugin.prototype.getCallbacksById = function(command, cbId) {
		var cbarr = [];
		if (!this.messageHandlers.hasOwnProperty(command))
			return false;
		for ( var id in this.messageHandlers[command]) {
			if (id == cbId) {
				cbarr.push(this.messageHandlers[command][id]);
			}
		}
		return cbarr;
	};
	PepperPlugin.prototype.removeCallbacksByCommand = function(command) {
		if (!this.messageHandlers.hasOwnProperty(command))
			return false;
		for ( var id in this.messageHandlers[command]) {
			delete this.messageHandlers[command][id];
		}
		delete this.messageHandlers[command];
		this.messageHandlers[command] = null;
		return true;
	};
	PepperPlugin.prototype.removeCallbackById = function(command, cbId) {
		if (!this.messageHandlers.hasOwnProperty(command))
			return;
		for ( var id in this.messageHandlers[command]) {
			if (id == cbId) {
				delete this.messageHandlers[command][id];
				return true;
			}
		}
		return false;
	};

	var listenerCount = 0;
	PepperPlugin.prototype.addListener = function(event, listener) {
		var cbId = listenerCount++;
		this.listenerHandlers[event] = this.listenerHandlers[event] || {};
		this.listenerHandlers[event][cbId] = listener;
		return cbId;
	};
	PepperPlugin.prototype.getListenersByEvent = function(event) {
		var cbarr = [];
		if (!this.listenerHandlers.hasOwnProperty(event)) {
			return false;
		}
		for ( var id in this.listenerHandlers[event]) {
			cbarr.push(this.listenerHandlers[event][id]);
		}
		return cbarr;
	};
	PepperPlugin.prototype.getListenerById = function(event, cbId) {
		var cbarr = [];
		if (!this.listenerHandlers.hasOwnProperty(event)) {
			return false;
		}
		for ( var id in this.listenerHandlers[event]) {
			if (id == cbId) {
				cbarr.push(this.listenerHandlers[event][id]);
			}
		}
		return cbarr;
	};
	PepperPlugin.prototype.removeListenersByEvent = function(event) {
		if (!this.listenerHandlers.hasOwnProperty(event))
			return false;
		for ( var id in this.listenerHandlers[event]) {
			delete this.listenerHandlers[event][id];
		}
		delete this.listenerHandlers[event];
		this.listenerHandlers[event] = null;
		return true;
	};
	PepperPlugin.prototype.removeListenerById = function(event, cbId) {
		if (!this.listenerHandlers.hasOwnProperty(event))
			return;
		for ( var id in this.listenerHandlers[event]) {
			if (id == cbId) {
				delete this.listenerHandlers[event][id];
				return true;
			}
		}
		return false;
	};

	var pepperPlugins = {};
	function getPepperPlugin(name) {
		if (pepperPlugins[name]) {
			return pepperPlugins[name];
		}
		pepperPlugins[name] = new PepperPlugin(name);
		return pepperPlugins[name];
	}

	Object.defineProperty(window.webapis, "_getPepperPlugin", {
		value : getPepperPlugin
	});

	function enumCheckerObj(objEnum, value) {
		for ( var key in objEnum) {
			if (objEnum[key] === value) {
				return true;
			}
		}
		return false;
	}
	Object.defineProperty(window.webapis, "_enumCheckerObj", {
		value : enumCheckerObj
	});
	function enumCheckerArray(arrEnum, value) {
		for ( var i = 0; i < arrEnum.length; i++) {
			if (arrEnum[i] === value) {
				return true;
			}
		}
		return false;
	}
	Object.defineProperty(window.webapis, "_enumCheckerArray", {
		value : enumCheckerArray
	});

	function typeChecker(type, value) {
		switch (type) {
		case "DOMString":
			return typeof value === "string";
			break;
		case "long":
		case "short":
			return typeof value === "number";
			break;
		case "float":
		case "double":
			return typeof value === "number";
			break;
		case "boolean":
			return typeof value === "boolean";
			break;
		case "function":
			return typeof value === "function";
			break;
		}
	}
	Object.defineProperty(window.webapis, "_checkTypeValid", {
		value : typeChecker
	});

	function WebAPIException() {
		// this.code // added as readonly attribute
		// this.name // added as readonly attribute
		// this.meessage // added as readonly attribute
	}

	WebAPIException.INDEX_SIZE_ERR = 1;
	WebAPIException.DOMSTRING_SIZE_ERR = 2;
	WebAPIException.HIERARCHY_REQUEST_ERR = 3;
	WebAPIException.WRONG_DOCUMENT_ERR = 4;
	WebAPIException.INVALID_CHARACTER_ERR = 5;
	WebAPIException.NO_DATA_ALLOWED_ERR = 6;
	WebAPIException.NO_MODIFICATION_ALLOWED_ERR = 7;
	WebAPIException.NOT_FOUND_ERR = 8;
	WebAPIException.NOT_SUPPORTED_ERR = 9;
	WebAPIException.INUSE_ATTRIBUTE_ERR = 10;
	WebAPIException.INVALID_STATE_ERR = 11;
	WebAPIException.SYNTAX_ERR = 12;
	WebAPIException.INVALID_MODIFICATION_ERR = 13;
	WebAPIException.NAMESPACE_ERR = 14;
	WebAPIException.INVALID_ACCESS_ERR = 15;
	WebAPIException.VALIDATION_ERR = 16;
	WebAPIException.TYPE_MISMATCH_ERR = 17;
	WebAPIException.SECURITY_ERR = 18;
	WebAPIException.NETWORK_ERR = 19;
	WebAPIException.ABORT_ERR = 20;
	WebAPIException.URL_MISMATCH_ERR = 21;
	WebAPIException.QUOTA_EXCEEDED_ERR = 22;
	WebAPIException.TIMEOUT_ERR = 23;
	WebAPIException.INVALID_NODE_TYPE_ERR = 24;
	WebAPIException.DATA_CLONE_ERR = 25;
	WebAPIException.INVALID_VALUES_ERR = 26;
	WebAPIException.IO_ERR = 27;
	WebAPIException.SERVICE_NOT_AVAILABLE_ERR = 28;
	WebAPIException.UNKNOWN_ERR = 9999;

	Object.defineProperty(window.webapis, "WebAPIException", {
		value : WebAPIException
	});

	function createWebAPIException(code, name, message) {

		// var obj = {};
		var webAPIException = new WebAPIException;

		Object.defineProperty(webAPIException, "code", {
			value : parseInt(code, 0)
		});
		Object.defineProperty(webAPIException, "name", {
			value : name + ""
		});
		Object.defineProperty(webAPIException, "message", {
			value : message + ""
		});
		return webAPIException;
	}

	function createWebAPIError(code, name, message) {
		var obj = {};

		Object.defineProperty(obj, "code", {
			value : parseInt(code, 0)
		});
		Object.defineProperty(obj, "name", {
			value : name + ""
		});
		Object.defineProperty(obj, "message", {
			value : message + ""
		});
		return obj;
	}
	Object.defineProperty(window.webapis, "_createWebAPIException", {
		value : createWebAPIException
	});
	Object.defineProperty(window.webapis, "_createWebAPIError", {
		value : createWebAPIError
	});

})(this); // "this" means global context at this line

(function(window) {
	var MOD_NAME = "AppCommon";
	var INSTANTIATED_NAMESPACE = "appcommon";
	var PEPPER_PLUGIN_NAME = "appcommon";
	if (!window.webapis)
		throw "Module " + MOD_NAME + ": window.webapis is not defined";

	var AppCommonScreenSaverState = {
		SCREEN_SAVER_OFF : 0,
		SCREEN_SAVER_ON : 1
	};

	var ppAppCommon = null;
	window.webapis[INSTANTIATED_NAMESPACE] = {
		AppCommonScreenSaverState : AppCommonScreenSaverState,
		
		// DOMString getVersion();
		getVersion : function() {
			ppAppCommon = ppAppCommon || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppAppCommon.postMessageAndAwaitResponse({
				command : "getVersion"
			});

			if (message.code == 0) {
				// success
				console.log("[appcommon.js] getVersion message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[appcommon.js] getVersion error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		// void setScreenSaver(AppCommonScreenSaverState state, optional SuccessCallback ? onsuccess, optional ErrorCallback ? onerror);
		setScreenSaver : function(state, onsuccess, onerror) {
			if (!window.webapis._enumCheckerObj(AppCommonScreenSaverState, state)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid AppCommonScreenSaverState type passed for 'state' parameter");
			}
			if (onsuccess && !window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}

			ppAppCommon = ppAppCommon || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppAppCommon.postMessage({
				command : "setScreenSaver",
				onoff : state
			}, function(message) {
				var msgData = message.data;
				if (msgData.code == 0) {
					// success
					onsuccess && onsuccess.call(null);
				} else {
					// error
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.code, msgData.errorName, msgData.errorMessage));
				}
			});
		}
	};
})(this);

(function(window) {
	var MOD_NAME = "DrmInfo";
	var INSTANTIATED_NAMESPACE = "drminfo";
	var PEPPER_PLUGIN_NAME = "drminfo";
	if (!window.webapis) {
		throw "Module " + MOD_NAME + ": window.webapis is not defined";
	}

	var ppDrmInfo = null;
	var exec = function(api) {
		console.log("[drminfo.js] " + api + "  begin");
		ppDrmInfo = ppDrmInfo || window.webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
		console.log("[drminfo.js] " + api + "  begin_01");
		var message = ppDrmInfo.postMessageAndAwaitResponse({
			command : api
		});
		console.log("[drminfo.js] " + api + "  end " + message);

		if (message.code == 0) {
			// success
			console.log("[drminfo.js] " + api + " message data " + message.data);
			return message.data;
		} else {
			// error
			console.log("[drminfo.js] " + api + "  error code " + message.code);
			throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
		}
	};

	window.webapis[INSTANTIATED_NAMESPACE] = {

		getVersion : function() {
			return exec("getVersion");
		},
		getEsn : function(CompName) {
			if (!window.webapis._checkTypeValid("DOMString", CompName)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'CompName' parameter");
			}
			
			ppDrmInfo = ppDrmInfo || window.webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			var message = ppDrmInfo.postMessageAndAwaitResponse({
				command : "getEsn",
				compName : CompName
			});

			if (message.code == 0) {
				// success
				console.log("[drminfo.js]  message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[drminfo.js] error code " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		IsSCSAStorage : function(CompName, FilePath) {
			if (!window.webapis._checkTypeValid("DOMString", CompName)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'CompName' parameter");
			}
			
			ppDrmInfo = ppDrmInfo || window.webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			var message = ppDrmInfo.postMessageAndAwaitResponse({
				command : "IsSCSAStorage",
				compName : CompName,
				param1: FilePath
			});

			if (message.code == 0) {
				// success
				console.log("[drminfo.js]  message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[drminfo.js] error code " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		GetLicenseFile : function(CompName, FilePath, onsuccess, onerror) {
			if (!window.webapis._checkTypeValid("DOMString", CompName)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'password' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", FilePath)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'dataLength' parameter");
			}
			if (onsuccess && !window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DrmInfoStringSuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}

			ppDrmInfo = ppDrmInfo || window.webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppDrmInfo.postMessage({
				command : "GetLicenseFile",
				compName : CompName,
				param1: FilePath
			}, function(message) {
				var msgData = message.data;
				if (msgData.code == 0) {
					// success
					onsuccess.call(null, msgData.data);
				} else {
					onerror && onerror.call(null, window.webapis._createWebAPIError(msgData.code, msgData.errorName, msgData.errorMessage));
				}
			});
		},
		DeleteLicense : function(CompName, FilePath, onsuccess, onerror) {
			if (!window.webapis._checkTypeValid("DOMString", CompName)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'CompName' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", FilePath)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'FilePath' parameter");
			}
			if (onsuccess && !window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DrmInfoStringSuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}

			ppDrmInfo = ppDrmInfo ||window.webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppDrmInfo.postMessage({
				command : "DeleteLicense",
				compName : CompName,
				param1: FilePath
			}, function(message) {
				var msgData = message.data;
				if (msgData.code == 0) {
					// success
					onsuccess.call(null, msgData.data);
				} else {
					onerror && onerror.call(null, window.webapis._createWebAPIError(msgData.code, msgData.errorName, msgData.errorMessage));
				}
			});
		},
		IsSmpLicensed : function(CompName, FilePath) {
			if (!window.webapis._checkTypeValid("DOMString", CompName)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'CompName' parameter");
			}
			
			ppDrmInfo = ppDrmInfo || window.webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			var message = ppDrmInfo.postMessageAndAwaitResponse({
				command : "IsSmpLicensed",
				compName : CompName,
				param1: FilePath
			});

			if (message.code == 0) {
				// success
				console.log("[drminfo.js]  message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[drminfo.js] error code " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		getSdiId : function() {
			return exec("getSdiId");
		}
	}

})(this);

(function(window) {
	var MOD_NAME = "Logging";
	var INSTANTIATED_NAMESPACE = "logging";
	var PEPPER_PLUGIN_NAME = "logging";
	if (!window.webapis) {
		throw "Module " + MOD_NAME + ": window.webapis is not defined";
	}

	var LoggingAgreedState = {
		NOT_AGREED : 0,
		AGREED : 1
	};

	var ppLogging = null;
	window.webapis[INSTANTIATED_NAMESPACE] = {

		LoggingAgreedState : LoggingAgreedState,

		// LoggingAgreedState isAgreedWith(DOMString agreementName);
		isAgreedWith : function(a) {
			if (!window.webapis._checkTypeValid("DOMString", a)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'agreementName' parameter");
			}

			ppLogging = ppLogging || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppLogging.postMessageAndAwaitResponse({
				command : "isAgreedWith",
				agreementname : a
			});

			if (message.code == 0) {
				// success
				console.log("[logging.js] isAgreedWith message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[logging.js] isAgreedWith error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}

		},

		// DOMString getVersion();
		getVersion : function() {
			ppLogging = ppLogging || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppLogging.postMessageAndAwaitResponse({
				command : "getVersion",
			});

			if (message.code == 0) {
				// success
				console.log("[logging.js] getVersion message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[logging.js] getVersion error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},

		// void setServiceConfigInfo(DOMString eventName, long queuemax, long expiration, long threshold, long loglevel, DOMString serverUrl, optional SuccessCallback ? onsuccess, optional ErrorCallback ? onerror);
		setServiceConfigInfo : function(a, b, c, d, e, f, onsuccess, onerror) {
			if (!window.webapis._checkTypeValid("DOMString", a)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'eventName' parameter");
			}
			if (!window.webapis._checkTypeValid("long", b)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'queuemax' parameter");
			}
			if (!window.webapis._checkTypeValid("long", c)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'expiration' parameter");
			}
			if (!window.webapis._checkTypeValid("long", d)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'threshold' parameter");
			}
			if (!window.webapis._checkTypeValid("long", e)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'loglevel' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", f)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'serverUrl' parameter");
			}
			if (onsuccess && !window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}

			ppLogging = ppLogging || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppLogging.postMessage({
				command : 'SetServiceConfInfo',
				eventname : a,
				queuemax : b,
				expiration : c,
				threshold : d,
				loglevel : e,
				serverurl : f
			}, function(message) {
				var msgData = message.data;
				if (msgData.code == 0) {
					// success
					console.log("[SetServiceConfInfo.js] message success");
					onsuccess.call(null, msgData.data);
				} else {
					console.log("[SetServiceConfInfo.js] message failed");
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.code, msgData.errorName, msgData.errorMessage));
				}
			});
		},

		//		void setEventHeader(DOMString modelName, DOMString userId, DOMString duid, DOMString country, long privacylog, optional SuccessCallback ? onsuccess, optional ErrorCallback ? onerror);
		setEventHeader : function(a, b, c, d, e, onsuccess, onerror) {
			if (!window.webapis._checkTypeValid("DOMString", a)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'modelName' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", b)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'userId' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", c)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'duid' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", d)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'country' parameter");
			}
			if (!window.webapis._checkTypeValid("long", e)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'privacylog' parameter");
			}
			if (onsuccess && !window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}

			ppLogging = ppLogging || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppLogging.postMessage({
				command : 'SetEventHeader',
				modename : a,
				userid : b,
				duid : c,
				country : d,
				privacylog : e
			}, function(message) {
				var msgData = message.data;
				if (msgData.code == 0) {
					// success
					console.log("[SetEventHeader.js] message success");
					onsuccess.call(null, msgData.data);
				} else {
					console.log("[SetEventHeader.js] message failed");
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.code, msgData.errorName, msgData.errorMessage));
				}
			});
		},

		// void addEventLog(DOMString eventName, DOMString time, DOMString category, DOMString value, DOMString desc, optional SuccessCallback ? onsuccess, optional ErrorCallback ? onerror);
		addEventLog : function(a, b, c, d, e, onsuccess, onerror) {
			if (!window.webapis._checkTypeValid("DOMString", a)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'eventName' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", b)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'time' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", c)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'category' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", d)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'value' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", e)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'desc' parameter");
			}
			if (onsuccess && !window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}

			ppLogging = ppLogging || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppLogging.postMessage({
				command : 'AddEventLog',
				eventname : a,
				time : b,
				category : c,
				value : d,
				desc : e
			}, function(message) {
				var msgData = message.data;
				if (msgData.code == 0) {
					// success
					console.log("[AddEventLog.js] message success");
					onsuccess.call(null);
				} else {
					console.log("[AddEventLog.js] message failed");
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.code, msgData.errorName, msgData.errorMessage));
				}
			});
		},

		// void addEventFullLog(DOMString eventName, DOMString log, optional SuccessCallback ? onsuccess, optional ErrorCallback ? onerror);
		addEventFullLog : function(a, b, onsuccess, onerror) {
			if (!window.webapis._checkTypeValid("DOMString", a)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'eventName' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", b)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'log' parameter");
			}
			if (onsuccess && !window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}

			ppLogging = ppLogging || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppLogging.postMessage({
				command : 'AddEventFullLog',
				eventname : a,
				log : b
			}, function(message) {
				var msgData = message.data;
				if (msgData.code == 0) {
					// success
					console.log("[addEventFullLog.js] message success");
					onsuccess.call(null);
				} else {
					console.log("[addEventFullLog.js] message failed");
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.code, msgData.errorName, msgData.errorMessage));
				}
			});
		},

		// void flushLog(optional SuccessCallback ? onsuccess, optional ErrorCallback ? onerror);
		flushLog : function(onsuccess, onerror) {
			if (onsuccess && !window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}

			ppLogging = ppLogging || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppLogging.postMessage({
				command : 'FlushLog'
			}, function(message) {
				var msgData = message.data;
				if (msgData.code == 0) {
					// success
					console.log("[FlushLog.js] message success");
					onsuccess.call(null);
				} else {
					console.log("[FlushLog.js] message failed");
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.code, msgData.errorName, msgData.errorMessage));
				}
			});
		},

		// void addEventConfigInfo(DOMString eventName, long queueMax, long expiration, long threshold, long loglevel, optional SuccessCallback ? onsuccess, optional ErrorCallback ? onerror);
		addEventConfigInfo : function(a, b, c, d, e, onsuccess, onerror) {
			if (!window.webapis._checkTypeValid("DOMString", a)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'eventName' parameter");
			}
			if (!window.webapis._checkTypeValid("long", b)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'queueMax' parameter");
			}
			if (!window.webapis._checkTypeValid("long", c)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'expiration' parameter");
			}
			if (!window.webapis._checkTypeValid("long", d)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'threshold' parameter");
			}
			if (!window.webapis._checkTypeValid("long", e)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'loglevel' parameter");
			}
			if (onsuccess && !window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}

			ppLogging = ppLogging || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppLogging.postMessage({
				command : 'AddEventConfInfo',
				eventname : a,
				queuemax : b,
				expiration : c,
				threshold : d,
				loglevel : e
			}, function(message) {
				var msgData = message.data;
				if (msgData.code == 0) {
					// success
					console.log("[AddEventConfInfo.js] message success");
					onsuccess && onsuccess.call(null, msgData.data);
				} else {
					// error
					console.log("[AddEventConfInfo.js] message failed");
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.code, msgData.errorName, msgData.errorMessage));
				}
			});
		},
	};
})(this);
(function(window) {
	var MOD_NAME = "ProductInfo";
	var INSTANTIATED_NAMESPACE = "productinfo";
	var PEPPER_PLUGIN_NAME = "productinfo";
	var PRODUCTINFO_SYSTEM_CONFIG_CHANGED = "PRODUCTINFO_SYSTEM_CONFIG_CHANGED";
	if (!window.webapis) {
		throw "Module " + MOD_NAME + ": window.webapis is not defined";
	}

	var PRDINFO_EVENT_SYSTEM_CONFIG_CHANGED = "PRDINFO_EVENT_SYSTEM_CONFIG_CHANGED";
	var ProductInfoConfigKey = {
		CONFIG_KEY_DATA_SERVICE : 0,
		CONFIG_KEY_SERVICE_COUNTRY : 1,
		CONFIG_KEY_SHOPLOGO : 2,
		CONFIG_KEY_CHANNELBOUND_APPS_TICKER : 3,
		CONFIG_KEY_SUPPORT_SOCCER_PANEL : 4,
		CONFIG_KEY_SUPPORT_ONTV_PANEL : 5,
		CONFIG_KEY_SUPPORT_NEWSON_PANEL : 6,
		CONFIG_KEY_SUPPORT_MYCONTENTS_PANEL : 7,
		CONFIG_KEY_SUPPORT_GAME_PANEL : 8,
		CONFIG_KEY_SUPPORT_CLIPS_PANEL : 9,
		CONFIG_KEY_SUPPORT_APPS_PANEL : 10,
		CONFIG_KEY_SYSTEM_PNP_COUNTRY : 11
	};

	var ProductInfoSiServerType = {
		SI_TYPE_OPERATIING_SERVER : 0,
		SI_TYPE_DEVELOPMENT_SERVER : 1,
		SI_TYPE_DEVELOPING_SERVER : 2
	};
	var ProductInfoNoGlass3dSupport = {
		NO_GLASS_3D_NOT_SUPPORTED : 0,
		NO_GLASS_3D_SUPPORTED : 1
	};

	var exec = function(api) {
		
		console.log("[productinfo.js] " + api + "  begin");
		ppPrdInfo = ppPrdInfo || window.webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

		var message = ppPrdInfo.postMessageAndAwaitResponse({
			command : api
		});
		console.log("[productinfo.js] " + api + "  end " + message);

		if (message.code == 0) {
			// success
			console.log("[productinfo.js] " + api + " message data " + message.data);
			return message.data;
		} else {
			// error
			console.log("[productinfo.js] " + api + "  error code " + message.code);
			throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
		}
	};

	var ppPrdInfo = null;
	window.webapis[INSTANTIATED_NAMESPACE] = {

		ProductInfoNoGlass3dSupport : ProductInfoNoGlass3dSupport,
		ProductInfoConfigKey : ProductInfoConfigKey,
		ProductInfoSiServerType : ProductInfoSiServerType,

		keylistenerArr : [],

		keylistener : function(key, listenerId) {
			this.key = key;
			this.listenerId = listenerId;
		},

		_hasKeyListener : function(key) {
			for (i = 0; i < this.keylistenerArr.length; i++) {
				if (this.keylistenerArr[i].key == key) {
					return true;
				}
			}
			return false;
		},

		_removeKeyListenerById : function(id) {
			for (i = 0; i < this.keylistenerArr.length; i++) {
				if (this.keylistenerArr[i].listenerId == id) {
					var obj = this.keylistenerArr[i];
					this.keylistenerArr.splice(i, 1);
					return obj;
				}
			}
			return null;
		},

		getVersion : function() {
			return exec("getVersion");
		},

		getFirmware : function() {
			return exec("getFirmware");
		},

		getDuid : function() {
			return exec("getDuid");
		},

		getModelCode : function() {
			return exec("getModelCode");
		},
		getModel : function() {
			return exec("getModel");
		},

		getSmartTVServerType : function() {
			return exec("getSmartTVServerType");
		},

		getSmartTVServerVersion : function() {
			return exec("getSmartTVServerVersion");
		},

		getTunerEpop : function() {
			return exec("getTunerEpop");
		},
		isUdPanelSupported:function() {
			return exec("isUDPanelSupported");
		},

		isSoccerModeEnabled : function() {
			return exec("getSoccerMode");
		},
		
		isTtvSupported : function() {
			return exec("isTtvSupported");
		},
		
		getNoGlass3dSupport : function() {
			return exec("getNoGlass3dSupport");
		},

		getLocalSet : function() {
			return exec("getLocalSet");
		},

		getRealModel : function() {
			return exec("getRealModel");
		},

		getSystemConfig : function(key) {
			if (!window.webapis._enumCheckerObj(ProductInfoConfigKey, key)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ProductInfoConfigKey type passed for 'key' parameter");
			}

			ppPrdInfo = ppPrdInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			var message = ppPrdInfo.postMessageAndAwaitResponse({
				command : "getSystemConfig",
				key : key
			});

			if (message.code == 0) {
				// success
				if (typeof message.data != "string") {
					message.data += "";
				}
				console.log("[productinfo.js] getSystemConfig message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[productinfo.js] getSystemConfig error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}

		},
		getPsid : function() {
			
			ppPrdInfo = ppPrdInfo
					|| webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			var message = ppPrdInfo.postMessageAndAwaitResponse({
				command : "getPsid"
			});

			if (message.code == 0) {
				// success
				if (typeof message.data != "string") {
					message.data += "";
				}
				console.log("[productinfo.js] getPsid message data "
						+ message.data);
				return message.data;
			} else {
				// error
				console.log("[productinfo.js] getPsid error "
						+ message.code);
				throw window.webapis._createWebAPIError(message.code,
						message.errorName, message.errorMessage);
			}

		},

		setSystemConfig : function(key, value, onsuccess, onerror) {
			if (!window.webapis._enumCheckerObj(ProductInfoConfigKey, key)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ProductInfoConfigKey type passed for 'key' parameter");
			}

			if (key != ProductInfoConfigKey.CONFIG_KEY_DATA_SERVICE && key != ProductInfoConfigKey.CONFIG_KEY_CHANNELBOUND_APPS_TICKER) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.NOT_SUPPORTED_ERR, "NotSupportedError", "key " + key + " is readonly");
				return;
			}

			if (!window.webapis._checkTypeValid("DOMString", value)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'value' parameter");
			}
			if (onsuccess && !window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}

			ppPrdInfo = ppPrdInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppPrdInfo.postMessage({
				command : "setSystemConfig",
				key : key,
				value : value
			}, function(message) {
				var msgData = message.data;
				if (msgData.code == 0) {
					// success
					onsuccess && onsuccess.call(null);
				} else {
					// error
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.code, msgData.errorName, msgData.errorMessage));
				}
			});
		},

		addSystemConfigChangeListener : function(key, listener) {
			if (!window.webapis._enumCheckerObj(ProductInfoConfigKey, key)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ProductInfoConfigKey type passed for 'key' parameter");
			}
			if (!window.webapis._checkTypeValid("function", listener)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ProductInfoConfigChangeListener type passed for 'listener' parameter");
			}
			if (this._hasKeyListener(key) == false) {
				ppPrdInfo = ppPrdInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

				var message = ppPrdInfo.postMessageAndAwaitResponse({
					command : "addSystemConfigChangeListener",
					propertyKey : key
				});

				if (message.code != 0) {
					// success
					throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
				}
			} else {
				console.log("[PrdInfo.js] need not registerSystemConfigKeys again, key : " + key);
			}
			
			var listenerId = ppPrdInfo.addListener(PRODUCTINFO_SYSTEM_CONFIG_CHANGED, function(msg) {
				if (key == msg.data.data) {
					listener(msg.data.data);
				}
			});
			var obj = new window.webapis[INSTANTIATED_NAMESPACE].keylistener(key, listenerId);
			this.keylistenerArr.push(obj);
			return listenerId;
		},

		removeSystemConfigChangeListener : function(listenerId) {
			if (!window.webapis._checkTypeValid("long", listenerId)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'listenerId' parameter");
			}
			
			var keyListener = this._removeKeyListenerById(listenerId);
			if( null == keyListener) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.NOT_FOUND_ERR, "NotFoundError", "Can not find Listener by this listenerId [" + listenerId + "]");
				return; 
			}
			
			if (this._hasKeyListener(keyListener.key) == false) {
				ppPrdInfo = ppPrdInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

				var message = ppPrdInfo.postMessageAndAwaitResponse({
					command : "removeSystemConfigChangeListener",
					propertyKey : keyListener.key
				});

				if (message.code == 0) {
					// success
					console.log("[ppPrdInfo.js] removeSystemConfigChangeListener success");
					ppPrdInfo.removeListenerById(PRODUCTINFO_SYSTEM_CONFIG_CHANGED, listenerId);
				} else {
					// error
					throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
				}
			} else {
				ppPrdInfo.removeListenerById(PRODUCTINFO_SYSTEM_CONFIG_CHANGED, listenerId);
			}
		}
	};
})(this);

(function(window) {
	var MOD_NAME = "TvInfo";
	var INSTANTIATED_NAMESPACE = "tvinfo";
	var PEPPER_PLUGIN_NAME = "tvinfo";
	if (!window.webapis) {
		throw "Module " + MOD_NAME + ": window.webapis is not defined";
	}

	var LISTENER_CAPTION_CHANGED = "TVINFO_EVENT_CAPTION_CHANGED";

	var TvInfoMenuKey = {
		CAPTION_ONOFF_KEY : 0,
		CAPTION_MODE_KEY : 1,
		CAPTION_FONT_SIZE_KEY : 2,
		CAPTION_FONT_STYLE_KEY : 3,
		CAPTION_FG_COLOR_KEY : 4,
		CAPTION_FG_OPACITY_KEY : 5,
		CAPTION_BG_COLOR_KEY : 6,
		CAPTION_BG_OPACITY_KEY : 7,
		CAPTION_EDGE_TYPE_KEY : 8,
		CAPTION_EDGE_COLOR_KEY : 9,
		CAPTION_WINDOW_COLOR_KEY : 10,
		CAPTION_WINDOW_OPACITY_KEY : 11
	};

	var TvInfoMenuValue = {
		// CAPTION_ONOFF_VALUE
		CAPTION_OFF : 0,
		CAPTION_ON : 1,

		// CAPTION_MODE_VALUE
		CAPTION_MODE_DEFAULT : 0,
		CAPTION_MODE_SERVICE1 : 1,
		CAPTION_MODE_SERVICE2 : 2,
		CAPTION_MODE_SERVICE3 : 3,
		CAPTION_MODE_SERVICE4 : 4,
		CAPTION_MODE_SERVICE5 : 5,
		CAPTION_MODE_SERVICE6 : 6,
		CAPTION_MODE_CC1 : 7,
		CAPTION_MODE_CC2 : 8,
		CAPTION_MODE_CC3 : 9,
		CAPTION_MODE_CC4 : 10,
		CAPTION_MODE_TEXT1 : 11,
		CAPTION_MODE_TEXT2 : 12,
		CAPTION_MODE_TEXT3 : 13,
		CAPTION_MODE_TEXT4 : 14,

		// CAPTION_FONT_SIZE_VALUE
		CAPTION_SIZE_DEFAULT : 0,
		CAPTION_SIZE_SMALL : 1,
		CAPTION_SIZE_STANDARD : 2,
		CAPTION_SIZE_LARGE : 3,
		CAPTION_SIZE_EXTRA_LARGE : 4,

		// CAPTION_FONT_STYLE_VALUE
		CAPTION_FONT_DEFAULT : 0,
		CAPTION_FONT_STYLE0 : 1,
		CAPTION_FONT_STYLE1 : 2,
		CAPTION_FONT_STYLE2 : 3,
		CAPTION_FONT_STYLE3 : 4,
		CAPTION_FONT_STYLE4 : 5,
		CAPTION_FONT_STYLE5 : 6,
		CAPTION_FONT_STYLE6 : 7,
		CAPTION_FONT_STYLE7 : 8,

		// CAPTION_FG_COLOR_VALUE
		// CAPTION_BG_COLOR_VALUE
		// CAPTION_EDGE_COLOR_VALUE
		// CAPTION_WINDOW_COLOR_VALUE
		CAPTION_COLOR_DEFAULT : 0,
		CAPTION_COLOR_WHITE : 1,
		CAPTION_COLOR_BLACK : 2,
		CAPTION_COLOR_RED : 3,
		CAPTION_COLOR_GREEN : 4,
		CAPTION_COLOR_BLUE : 5,
		CAPTION_COLOR_YELLOW : 6,
		CAPTION_COLOR_MAGENTA : 7,
		CAPTION_COLOR_CYAN : 8,

		// CAPTION_FG_OPACITY_VALUE
		// CAPTION_BG_OPACITY_VALUE
		// CAPTION_WINDOW_OPACITY_VALUE
		CAPTION_OPACITY_SOLID : 0,
		CAPTION_OPACITY_FLASH : 1,
		CAPTION_OPACITY_TRANSLUCENT : 2,
		CAPTION_OPACITY_TRANSPARENT : 3,
		CAPTION_OPACITY_DEFAULT : 4,

		// CAPTION_EDGE_TYPE_VALUE
		CAPTION_EDGE_NONE : 0,
		CAPTION_EDGE_RAISED : 1,
		CAPTION_EDGE_DEPRESSED : 2,
		CAPTION_EDGE_UNIFORM : 3,
		CAPTION_EDGE_DROP_SHADOWED : 4
	};

	var ppTvInfo = null;
	window.webapis[INSTANTIATED_NAMESPACE] = {

		TvInfoMenuKey : TvInfoMenuKey,
		TvInfoMenuValue : TvInfoMenuValue,

		keylistenerArr : [],

		keylistener : function(key, listenerId) {
			this.key = key;
			this.listenerId = listenerId;
		},

		_hasKeyListener : function(key) {
			for (i = 0; i < this.keylistenerArr.length; i++) {
				if (this.keylistenerArr[i].key == key) {
					return true;
				}
			}
			return false;
		},

		_removeKeyListenerById : function(id) {
			for (i = 0; i < this.keylistenerArr.length; i++) {
				if (this.keylistenerArr[i].listenerId == id) {
					var obj = this.keylistenerArr[i];
					this.keylistenerArr.splice(i, 1);
					return obj;
				}
			}
			return null;
		},

		// DOMString getVersion();
		getVersion : function() {
			ppTvInfo = ppTvInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppTvInfo.postMessageAndAwaitResponse({
				command : "getVersion"
			});

			if (message.code == 0) {
				// success
				console.log("[TvInfo.js] getVersion message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[TvInfo.js] getVersion error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}

		},
		
		isTvsPicSizeResized:function(){
			ppTvInfo = ppTvInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppTvInfo.postMessageAndAwaitResponse({
				command : "isTVSPicSizeResized"
			});

			if (message.code == 0) {
				// success
				console.log("[TvInfo.js] isTvsPicSizeResized  message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[TvInfo.js] isTvsPicSizeResized  error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},

		// TvInfoMenuValue getMenuValue(TvInfoMenuKey key);
		getMenuValue : function(key) {
			if (!window.webapis._enumCheckerObj(TvInfoMenuKey, key)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid TvInfoMenuKey type passed for 'key' parameter");
			}

			ppTvInfo = ppTvInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppTvInfo.postMessageAndAwaitResponse({
				command : "getMenuValue",
				propertyKey : key
			});

			if (message.code == 0) {
				// success
				return message.data;
			} else {
				// error
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},

		// unsigned long addCaptionChangeListener(TvInfoMenuKey key, TvInfoCaptionChangeListener listener);
		addCaptionChangeListener : function(key, listener) {
			if (!window.webapis._enumCheckerObj(TvInfoMenuKey, key)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid TvInfoMenuKey type passed for 'key' parameter");
			}
			if (!window.webapis._checkTypeValid("function", listener)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid TvInfoCaptionChangeListener type passed for 'listener' parameter");
			}

			if (this._hasKeyListener(key) == false) {
				ppTvInfo = ppTvInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
				var message = ppTvInfo.postMessageAndAwaitResponse({
					command : "registerVconfKeysForCaption",
					propertyKey : key
				});
				if (message.code != 0) {
					// error
					throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
				}
			} else {
				console.log("[TvInfo.js] need not registerVconfKeysForCaption again, key : " + key);
			}
			var listenerId = ppTvInfo.addListener(LISTENER_CAPTION_CHANGED, function(msg) {
				if(key == msg.data.data) {
					listener(msg.data.data);
				}
			});

			var obj = new window.webapis[INSTANTIATED_NAMESPACE].keylistener(key, listenerId);
			this.keylistenerArr.push(obj);
			return listenerId;
		},

		// void removeCaptionChangeListener(unsigned long listenerId);
		removeCaptionChangeListener : function(listenerId) {
			if (!window.webapis._checkTypeValid("long", listenerId)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid listenerId type passed for 'listenerId' parameter");
			}

			var keyListener = this._removeKeyListenerById(listenerId);
			if( null == keyListener) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.NOT_FOUND_ERR, "NotFoundError", "Can not find Listener by this listenerId [" + listenerId + "]");
				return; 
			}
			
			if (this._hasKeyListener(keyListener.key) == false) {
				ppTvInfo = ppTvInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
				var message = ppTvInfo.postMessageAndAwaitResponse({
					command : "unRegisterVconfKeysForCaption",
					propertyKey : keyListener.key
				});
				if (message.code != 0) {
					// error
					throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
				} else {
					ppTvInfo.removeListenerById(LISTENER_CAPTION_CHANGED, listenerId);
				}
			} else {
				ppTvInfo.removeListenerById(LISTENER_CAPTION_CHANGED, listenerId);
			}
			console.log("[TvInfo.js] removeCaptionChangeListener success");
		}
	};
})(this);

(function(window) {
	var MOD_NAME = "WidgetData";
	var INSTANTIATED_NAMESPACE = "widgetdata";
	var PEPPER_PLUGIN_NAME = "widgetdata";
	if (!window.webapis) {
		throw "Module " + MOD_NAME + ": window.webapis is not defined";
	}

	var ppWidgetData = null;
	window.webapis[INSTANTIATED_NAMESPACE] = {

		// DOMString getVersion();
		getVersion : function() {

			ppWidgetData = ppWidgetData || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppWidgetData.postMessageAndAwaitResponse({
				command : "getVersion"
			});

			if (message.code == 0) {
				// success
				console.log("[widgetdata.js] getVersion message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[widgetdata.js] getVersion error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},

		// void readWidgetData(DOMString password, long dataLength, DOMString widgetId, WidgetDataStringSuccessCallback onsuccess, optional ErrorCallback ? onerror);
		readWidgetData : function(password, dataLength, widgetId, onsuccess, onerror) {
			if (!window.webapis._checkTypeValid("DOMString", password)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'password' parameter");
			}
			if (!window.webapis._checkTypeValid("long", dataLength)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'dataLength' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", widgetId)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'widgetId' parameter");
			}
			if (!window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid WidgetDataStringSuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}

			ppWidgetData = ppWidgetData || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppWidgetData.postMessage({
				command : "ReadWidgetData",
				Password : password,
				DataLength : dataLength,
				widgetID : widgetId
			}, function(message) {
				var msgData = message.data;
				if (msgData.code == 0) {
					// success
					onsuccess.call(null, msgData.data);
				} else {
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.code, msgData.errorName, msgData.errorMessage));
				}
			});
		},

		// void removeWidgetData(DOMString widgetId, optional SuccessCallback ? onsuccess, optional ErrorCallback ? onerror);
		removeWidgetData : function(widgetId, onsuccess, onerror) {
			if (!window.webapis._checkTypeValid("DOMString", widgetId)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'widgetId' parameter");
			}
			if (onsuccess && !window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}

			ppWidgetData = ppWidgetData || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppWidgetData.postMessage({
				command : "RemoveWidgetData",
				widgetID : widgetId
			}, function(message) {
				var msgData = message.data;
				if (msgData.code == 0) {
					// success
					onsuccess && onsuccess.call(null);
				} else {
					// error
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.code, msgData.errorName, msgData.errorMessage));
				}
			});
		},

		// void writeWidgetData(DOMString password, DOMString data, long dataLength, DOMString widgetId, optional SuccessCallback ? onsuccess, optional ErrorCallback ? onerror);
		writeWidgetData : function(password, data, dataLength, widgetId, onsuccess, onerror) {
			if (!window.webapis._checkTypeValid("DOMString", password)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'password' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", data)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'data' parameter");
			}
			if (!window.webapis._checkTypeValid("long", dataLength)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'dataLength' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", widgetId)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'widgetId' parameter");
			}
			if (onsuccess && !window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}

			ppWidgetData = ppWidgetData || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppWidgetData.postMessage({
				command : 'WriteWidgetData',
				Password : password,
				Data : data,
				DataLength : dataLength,
				widgetID : widgetId
			}, function(message) {
				var msgData = message.data;
				if (msgData.code == 0) {
					// success
					onsuccess && onsuccess.call(null);
				} else {
					// Error
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.code, msgData.errorName, msgData.errorMessage));
				}
			});
		}

	};
})(this);

(function(window) {
	var MOD_NAME = "was";
	var INSTANTIATED_NAMESPACE = "was";
	var PEPPER_PLUGIN_NAME = "was";
	if (!window.webapis)
		throw "Module " + MOD_NAME + ": window.webapis is not defined";

	var ppWAS = null;
	window.webapis[INSTANTIATED_NAMESPACE] = {
		//app's install status
		INSTALL_STATE_DOWNLOADED : 0,                                                                                                                    
		INSTALL_STATE_INSTALLING : 1,
		INSTALL_STATE_UNINSTALLING : 2,
		INSTALL_STATE_INSTALLED : 3,
		INSTALL_STATE_UNDOWNLOADED : 4,
 
		//app's installed source type
		INSTALLED_SOURCE_TYPE_LOCAL : 0,
		INSTALLED_SOURCE_TYPE_APPSTORE : 1,
		INSTALLED_SOURCE_TYPE_OTHER : 2,

		getVersion : function() {
			console.log("[WAS_PP] getVersion");
			ppWAS = ppWAS || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			var result = ppWAS.postMessageAndAwaitResponse({
				command : 'was_plugin_getVersion'
			});
			return result;
		},
		
		getAtoken : function () {
			console.log("[WAS_PP] getAtoken");
			ppWAS = ppWAS || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			var atoken = ppWAS.postMessageAndAwaitResponse({
				command : 'was_plugin_GetAtoken'
			});
			console.log("[WAS_PP] [INFO] atoken is [ " + atoken + "]");
			return atoken;
		},
		
		moveToAppDetailView : function (calleeId, callerId, category, contentId) {
			console.log("[WAS_PP] moveToAppDetailView");
			if (!window.webapis._checkTypeValid("DOMString", calleeId)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'calleeId' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", callerId)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'callerId' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", category)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'category' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", contentId)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'contentId' parameter");
			}
			ppWAS = ppWAS || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			var result = ppWAS.postMessageAndAwaitResponse({
				command : 'was_plugin_MoveAppInfo',
				callerid : callerId,
				calleeid : calleeId,
				category : category,
				contentid : contentId
			});
			if (result == 0) {
				throw window.webapis._createWebAPIException(0, "FatalError", "move to app detail view failed");
			}
		},
		
		activateWithData : function (type, data, fromApp, fromWidget, widgetData) {
			console.log("[WAS_PP] activateWithData");
			if (!window.webapis._checkTypeValid("DOMString", type)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'type' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", data)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'data' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", fromApp)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'fromApp' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", fromWidget)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'fromWidget' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", widgetData)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'widgetData' parameter");
			}
			if (type == "") {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Empty DOMString passed for 'type' parameter");
			}
			ppWAS = ppWAS || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			var result = ppWAS.postMessageAndAwaitResponse({
				command : 'was_plugin_ActivateWithData',
				type : type,
				data : data,
				fromapp : fromApp,
				fromwidget : fromWidget,
				widgetdata : widgetData
			});
			if (result == 0) {
				throw window.webapis._createWebAPIException(0, "FatalError", "activate with data failed");
			}
		},
		
		getAppInfo : function(appId) {
			console.log("[WAS_PP] getAppInfo");
			if (!window.webapis._checkTypeValid("DOMString", appId)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'appId' parameter");
			}
			ppWAS = ppWAS || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			var result = ppWAS.postMessageAndAwaitResponse({
				command : 'was_plugin_getAppInfo',
				appid: appId
			});
			console.log("[WAS_PP] getAppInfo success");
			if (result == "0") {
				return null;
			} else {
				return result;
			}
		}

	};
})(this);

(function(window) {
	var MOD_NAME = "sso";
	var INSTANTIATED_NAMESPACE = "sso";
	var PEPPER_PLUGIN_NAME = "sso";
	if (!window.webapis)
		throw "Module " + MOD_NAME + ": window.webapis is not defined";
	
	var SsoLoginState = {
		SSO_NOT_LOGIN : 0,
		SSO_LOGIN : 1
	}; 
	
	var ppSSO = null;
	window.webapis[INSTANTIATED_NAMESPACE] = {
		SsoLoginState : SsoLoginState,
		
		SsoData : function() {
			var bLogin;
			var id;
			var authToken;
			var uid;
			var guid;
		},
		
		SsoCpData : function() {
			var status;
			var ssoid;
			var id;
			var password;
		},
		
		SsoAuthTokenData : function() {
			var status;
			var authToken;
		},
		
		SsoServiceLoginData : function() {
			var status;
			var authToken;
			var accountId;
		},
		
		getVersion : function() {
			console.log("[SSO_PP] getVersion");
			ppSSO = ppSSO || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			var result = ppSSO.postMessageAndAwaitResponse({
				command : 'sso_plugin_getVersion'
			});
			return result;
		},
		
		getSsoState : function (eventName) {
			console.log("[SSO_PP] getSsoState");
			if (typeof(eventName) == 'undefined')
			{
				eventName = "";
			}
			ppSSO = ppSSO || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			var loginfo = ppSSO.postMessageAndAwaitResponse({
				command : 'sso_plugin_getSSOState',
				eventName : eventName
			});
			console.log("[SSO_PP] [INFO] the sso loginfo is " + loginfo);
			var data = new this.SsoData();
			if (loginfo =="" || loginfo == -1) {
				data.bLogin = false;
				data.id = "";
				data.authToken = "";
				data.uid = "";
				data.guid = "";
			} else {
				var tmpValue = loginfo.split("?");
				data.bLogin = true;
				data.id = ((typeof(tmpValue[0]) == 'undefined') ? '' : tmpValue[0]);
				data.authToken = ((typeof(tmpValue[1]) == 'undefined') ? '' : tmpValue[1]);
				data.uid = ((typeof(tmpValue[2]) == 'undefined') ? '' : tmpValue[2]);
				data.guid = ((typeof(tmpValue[3]) == 'undefined') ? '' : tmpValue[3]);
			}
			return data;
		},
		
		getGuid : function () {
			console.log("[SSO_PP] getGuid");
			var data = this.getSsoState("sso_plugin_getGuid");
			console.log("[SSO_PP] Guid is [" + data.guid + "]");
			return data.guid;
		},
		
		getLoginStatus : function () {
			console.log("[SSO_PP] getLoginStatus");
			var data = this.getSsoState("sso_plugin_getLoginStatus");
			if (data.bLogin == true) {
				return this.SsoLoginState.SSO_LOGIN;
			} else {
				return this.SsoLoginState.SSO_NOT_LOGIN;
			}
		},
		
		getLoginUid  : function () {
			console.log("[SSO_PP] getLoginUid");
			var data = this.getSsoState("sso_plugin_getLoginUid");
			return data.uid;
		},
		
		getCpId : function (cpName, onsuccess, onerror) {
			console.log("[SSO_PP] getCpId");
			if (!window.webapis._checkTypeValid("DOMString", cpName)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'cpName' parameter");
			}
			if (cpName == "") {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid passed for 'cpName' parameter");
			}
			if (!window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid getCpId SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}
			var ret = this.checkAPPInstalledbyCpName(cpName);
			if (ret == 0) {
				//app is not installed
				onerror && onerror.call(null, webapis._createWebAPIError(-1, "paramInvaild", "the cp is not exist"));
				return;
			}
			ppSSO = ppSSO || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppSSO.postMessage({
				command : "sso_plugin_getCPID",
				cpname : cpName
			}, function(message) {
				var msgData = message.data;
				console.log("[SSO_PP] message");
				if (msgData.status == 0) {
					// success
					console.log("[SSO_PP] message success");
					var ssoInfo = msgData.ssoInfo.split("?");
					var ssoid = ((typeof(ssoInfo[0]) == 'undefined') ? '' : ssoInfo[0]);
					var status = false;
					if (ssoid == "") {
						status = false;
					} else {
						status = true;
					}
					var cpInfo = msgData.cpInfo.split("?");
					var id = ((typeof(cpInfo[0]) == 'undefined') ? '' : cpInfo[0]);
					var password = ((typeof(cpInfo[1]) == 'undefined') ? '' : cpInfo[1]);
					var cpData = new webapis.sso.SsoCpData();
					cpData.status = status;
					//cpData.ssoid = ssoid;
					cpData.ssoId  = ssoid;
					cpData.id = id;
					cpData.password = password;
					onsuccess.call(null, cpData);
				} else {
					//error
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.status, msgData.errorName, msgData.errorMessage));
				}
			});
		},
		
		showAccountView : function (widgetName, onsuccess, onerror) {
			console.log("[SSO_PP] showAccountView");
			if (!window.webapis._checkTypeValid("DOMString", widgetName)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'widgetName' parameter");
			}
			if (!window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid showAccountView SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}
			ppSSO = ppSSO || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppSSO.postMessage({
				command : "sso_plugin_showAccountView",
				eventType : '401',
				eventName : 'sso_plugin_event',
				data : widgetName
			}, function(message) {
				console.log("[SSO_PP] message");
				var msgData = message.data;
				if (msgData.status == 0) {
					// success
					var data;
					if ("" != msgData.context) {
						//"result.status?result.ssoid?result.uid?result.guid?result.AuthToken?result.id?result.pass;"
						var message = msgData.context.split("?");
						data = {
							status: ((typeof(message[0]) == 'undefined') ? '' : message[0])
						};
					} else {
						data = {
							status: ''
						};
					}
					onsuccess.call(null, data);
				} else {
					//error
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.status, msgData.errorName, msgData.errorMessage));
				}
			});
		},
		
		showRegisterServiceView : function (cpName, onsuccess, onerror) {
			console.log("[SSO_PP] showRegisterServiceView");
			if (!window.webapis._checkTypeValid("DOMString", cpName)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'cpName' parameter");
			}
			if (cpName == "") {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid passed for 'cpName' parameter");
			}
			if (!window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid showRegisterServiceView SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}
			var ret = this.checkAPPInstalledbyCpName(cpName);
			if (ret == 0) {
				//app is not installed
				onerror && onerror.call(null, webapis._createWebAPIError(-1, "paramInvaild", "the cp is not exist"));
				return;
			}
			
			var loginStatus = this.SsoLoginState.SSO_NOT_LOGIN;
			var data = this.getSsoState("showRegisterServiceView");
			if (data == -1) {
				//check privilege failed
				onerror && onerror.call(null, webapis._createWebAPIError(-1, "SSO", "check privilege failed"));
				return;
			}
			if (data.bLogin == true) {
				loginStatus = this.SsoLoginState.SSO_LOGIN;
			}
			
			if (loginStatus == 0) {
				//SSO not login
				onerror && onerror.call(null, webapis._createWebAPIError(-1, "SSO", "the SSO is not login"));
				return;
			}
			ppSSO = ppSSO || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppSSO.postMessage({
				command : "sso_plugin_registerService",
				eventType : '400',
				eventName : 'sso_plugin_event',
				data : cpName
			}, function(message) {
				console.log("[SSO_PP] message");
				var msgData = message.data;
				if (msgData.status == 0) {
					// success
					console.log("[SSO_PP] message success");
					onsuccess.call(null, msgData.context);
				} else {
					//error
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.status, msgData.errorName, msgData.errorMessage));
				}
			});
		},
		
		getOspAccessToken : function (appID, secretKey, onsuccess, onerror) {
			console.log("[SSO_PP] getOspAccessToken");
			if (!window.webapis._checkTypeValid("DOMString", appID) || appID == "") {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'appID' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", secretKey) || secretKey == "") {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'appID' parameter");
			}
			if (!window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid getOspAccessToken SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}
			// check SSO login
			var loginStatus = this.SsoLoginState.SSO_NOT_LOGIN;
			var data = this.getSsoState();
			if (data == -1) {
				//check privilege failed
				onerror && onerror.call(null, webapis._createWebAPIError(-1, "SSO", "check privilege failed"));
				return;
			}
			if (data.bLogin == true) {
				loginStatus = this.SsoLoginState.SSO_LOGIN;
			}
			if (loginStatus == 0) {
				//SSO not login
				onerror && onerror.call(null, webapis._createWebAPIError(-1, "SSO", "the SSO is not login"));
				return;
			}
			ppSSO = ppSSO || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			var data = appID + "?" + secretKey;
			ppSSO.postMessage({
				command : "sso_plugin_getOSPAccessToken",
				eventType : '204',
				eventName : 'sso_plugin_event',
				data : data
			}, function(message) {
				console.log("[SSO_PP] message");
				var msgData = message.data;
				if (msgData.status == 0) {
					// success
					console.log("[SSO_PP] message success");
					onsuccess.call(null, msgData.context);
				} else {
					//error
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.status, msgData.errorName, msgData.errorMessage));
				}
			});
		},
		
		showCreateAccountView : function (onsuccess, onerror) {
			console.log("[SSO_PP] showCreateAccountView");
			if (!window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid showCreateAccountView SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}
			ppSSO = ppSSO || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppSSO.postMessage({
				command : "sso_plugin_createAccount",
				eventType : '402',
				eventName : 'sso_plugin_event',
				data : ''
			}, function(message) {
				console.log("[SSO_PP] message");
				var msgData = message.data;
				if (msgData.status == 0) {
					// success
					console.log("[SSO_PP] message success");
					onsuccess.call(null, msgData.context);
				} else {
					//error
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.status, msgData.errorName, msgData.errorMessage));
				}
			});
		},

		loginServiceAccount : function (cpName, tokenExpired, onsuccess, onerror) {
			console.log("[SSO_PP] loginServiceAccount");
			if (!window.webapis._checkTypeValid("DOMString", cpName)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'cpName' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", tokenExpired)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'tokenExpired' parameter");
			}
			if (cpName == "") {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid passed for 'serviceTitle' parameter");
			}
			if (!window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid loginServiceAccount SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}
			if (tokenExpired == "") {
				tokenExpired = "false";
			}
			var ret = this.checkAPPInstalledbyCpName(cpName);
			if (ret == 0) {
				//app is not installed
				onerror && onerror.call(null, webapis._createWebAPIError(-1, "paramInvaild", "the cp is not exist"));
				return;
			}
			ppSSO = ppSSO || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppSSO.postMessage({
				command : "sso_plugin_ServiceLogin",
				eventType : '406',
				eventName : 'sso_plugin_event',
				data : cpName + "?" + tokenExpired
			}, function(message) {
				console.log("[SSO_PP] message");
				var msgData = message.data;
				if (msgData.status == 0) {
					// success
					console.log("[SSO_PP] message success");
					var tmpData = msgData.context.split("?");
					var ServiceLoginData = new webapis.sso.SsoServiceLoginData();
					ServiceLoginData.accountId = ((typeof(tmpData[0]) == 'undefined') ? '' : tmpData[0]);
					ServiceLoginData.authToken = ((typeof(tmpData[1]) == 'undefined') ? '' : tmpData[1]);
					ServiceLoginData.status = ((typeof(tmpData[2]) == 'undefined') ? '' : tmpData[2]);
					onsuccess.call(null, ServiceLoginData);
				} else {
					//error
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.status, msgData.errorName, msgData.errorMessage));
				}
			});
		},
		
		logoutServiceAccount : function (cpName, onsuccess, onerror) {
			console.log("[SSO_PP] logoutServiceAccount");
			if (!window.webapis._checkTypeValid("DOMString", cpName)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'cpName' parameter");
			}
			if (cpName == "") {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid passed for 'serviceTitle' parameter");
			}
			if (!window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid logoutServiceAccount SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}
			var ret = this.checkAPPInstalledbyCpName(cpName);
			if (ret == 0) {
				//app is not installed
				onerror && onerror.call(null, webapis._createWebAPIError(-1, "paramInvaild", "the cp is not exist"));
				return;
			}
			
			ppSSO = ppSSO || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppSSO.postMessage({
				command : "sso_plugin_ServiceLogout",
				eventType : '408',
				eventName : 'sso_plugin_event',
				data : cpName
			}, function(message) {
				console.log("[SSO_PP] message");
				var msgData = message.data;
				if (msgData.status == 0) {
					// success
					console.log("[SSO_PP] message success");
					onsuccess.call(null, msgData.context);
				} else {
					//error
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.status, msgData.errorName, msgData.errorMessage));
				}
			});
		},
		
		getOAuthToken : function (cpName, tokenExpired, onsuccess, onerror) {
			console.log("[SSO_PP] getOAuthToken");
			if (!window.webapis._checkTypeValid("DOMString", cpName)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'cpName' parameter");
			}
			if (!window.webapis._checkTypeValid("DOMString", tokenExpired)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'tokenExpired' parameter");
			}
			if (cpName == "") {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid passed for 'serviceTitle' parameter");
			}
			if (!window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid getOAuthToken SuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}
			if (tokenExpired == "") {
				tokenExpired = "false";
			}
			var ret = this.checkAPPInstalledbyCpName(cpName);
			if (ret == 0) {
				//app is not installed
				onerror && onerror.call(null, webapis._createWebAPIError(-1, "paramInvaild", "the cp is not exist"));
				return;
			}
			ppSSO = ppSSO || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppSSO.postMessage({
				command : "sso_plugin_getOAuthToken",
				eventType : '405',
				eventName : 'sso_plugin_event',
				data : cpName + "?" + tokenExpired
			}, function(message) {
				console.log("[SSO_PP] message");
				var msgData = message.data;
				if (msgData.status == 0) {
					// success
					console.log("[SSO_PP] message success");
					var tmpData = msgData.context.split("?");
					var AuthTokenData = new webapis.sso.SsoAuthTokenData();
					AuthTokenData.authToken = ((typeof(tmpData[0]) == 'undefined') ? '' : tmpData[0]);
					AuthTokenData.status = ((typeof(tmpData[1]) == 'undefined') ? '' : tmpData[1]);
					onsuccess.call(null, AuthTokenData);
				} else {
					//error
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.status, msgData.errorName, msgData.errorMessage));
				}
			});
		},
		
		getSnsList : function (widgetID, onsuccess, onerror) {
			console.log("[SSO_PP] getSnsList");
			if (!window.webapis._checkTypeValid("DOMString", widgetID)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'widgetID' parameter");
			}
			if (!window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid VersionSuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}
			ppSSO = ppSSO || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppSSO.postMessage({
				command : "sso_plugin_getSNSList",
				eventType : '32',
				eventName : 'sso_plugin_event',
				data : widgetID
			}, function(message) {
				console.log("[SSO_PP] message");
				var msgData = message.data;
				if (msgData.status == 0) {
					// success
					console.log("[SSO_PP] message success");
					/*parse data*/
					var data;
					if (msgData.context.indexOf("fail") > 0) {
						data = "{'stat':'fail'}";
					} else {
						var tempData = msgData.context.split('&widgetid=');
						if (tempData.length >= 1) {
							/*parse stat and ssoid*/
							var temp = tempData[0].split('&ssoid=');
							if (temp.length == 2 && temp[1] != "not_login") {
								data = "{'stat':'ok', 'ssoid' : ' " + temp[1] + "'";
							} else {
								data = "{'stat':'ok', 'ssoid' : ''";
							}
							/*parse widget info*/
							for (var i = 1; i < tempData.length; i++) {
								/*parse head of snslist*/
								if (i == 1) {
									data += ", 'snslist' : [";
								}
								/*parse widget [11091000001&widgetname=Twitter&cpname=Twitter&id=&pw=]*/
								var tempInfo = tempData[i].split('&');
								for (var j = 0; j < tempInfo.length; j++) {
									if (j == 0) {
										data += "{'widgetid' : '" + tempInfo[j] + "'";
									} else if (j == 1) {
										data += ", 'widgetname' : '" + tempInfo[j].split('=')[1] + "'";
									} else if (j == 2) {
										data += ", 'cpname' : '" + tempInfo[j].split('=')[1] + "'";
									} else if (j == 3) {
										data += ", 'id' : '" + tempInfo[j].split('=')[1] + "'}";
									}
								}
								/*parse tail of snslist*/
								if (i == (tempData.length - 1)) {
									data += "]";
								} else {
									data += ",";
								}
							}
							data += "}";
						} else {
							data = "{'stat':'ok'}";
						}
					}
					onsuccess.call(null, data);
				} else {
					//error
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.status, msgData.errorName, msgData.errorMessage));
				}
			});
		},
		
		checkAPPInstalledbyCpName : function (cpName) {
			console.log("[SSO_PP] checkAPPInstalledbyCpName");
			if (!window.webapis._checkTypeValid("DOMString", cpName)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'cpName' parameter");
			}
			if (cpName == "") {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid passed for 'cpName' parameter");
			}
			ppSSO = ppSSO || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			var result = ppSSO.postMessageAndAwaitResponse({
				command : 'sso_plugin_checkApp',
				cpname : cpName
			});
			return result;
		},
	};
})(this);

(function(window) {
	var MOD_NAME = "Network";
	var INSTANTIATED_NAMESPACE = "network";
	var PEPPER_PLUGIN_NAME = "network";
	if (!window.webapis) {
		throw "Module " + MOD_NAME + ": window.webapis is not defined";
	}

	var ppNetwork = null;
	var NETWORK_STATUS_CHANGE  = "NETWORK_STATUS_CHANGE";
	var cdata = null;
	var NetworkActiveConnectionType = {
			DISCONNECTED : 0,
			WIFI : 1,
			CELLULAR : 2,
			ETHERNET : 3
	};
	
	var NetworkIpMode ={
			NONE : 0,
			STATIC : 1,
			DYNAMIC : 2,
			AUTO : 3,
			FIXED : 4
	};
	
	var NetworkGatewayBoolState = {
			FAIL : 0,
			PASS : 1
	};
	
	var NetworkState =  {
			LAN_CABLE_ATTACHED : 0,
			LAN_CABLE_DETACHED : 1,
			LAN_CABLE_STATE_UNKNOWN : 3,
			GATEWAY_CONNECTED : 4,
			GATEWAY_DISCONNECTED: 5,
			WIFI_MODULE_STATE_ATTACHED: 6,
			WIFI_MODULE_STATE_DETACHED : 7,
			WIFI_MODULE_STATE_UNKNOWN: 8
	};

	window.webapis[INSTANTIATED_NAMESPACE] = {
			
		NetworkActiveConnectionType : NetworkActiveConnectionType,
		NetworkIpMode : NetworkIpMode,
		NetworkGatewayBoolState : NetworkGatewayBoolState,
		NetworkState : NetworkState,

		// DOMString getVersion();
		getVersion : function() {

			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "getVersion"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] getVersion message data " + message.data);
				return message.data;
			} else {
				// error
                console.log("[network.js] getVersion error " + message.code);
                 cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		getActiveConnectionType : function(){
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "getActiveConnectionType"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] getActiveConnectionType message data " + message.data);
				return message.data;
			} else {
				// error
                 console.log("[network.js] getActiveConnectionType error " + message.code);
                 cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},


		getdata : function()
		{
			return cdata;
		},
		
		//	unsigned long addNetworkStateChangeListener(NetworkStateChangedCallback listener);
		addNetworkStateChangeListener : function(listener){
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "addNetworkStateChangeListener"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] addNetworkStateChangeListener  success");

				var listenerId = ppNetwork.addListener(NETWORK_STATUS_CHANGE, function(msg) {
					listener(msg.data.result);
				});
				console.log("[network.js] listenerId " + listenerId);
				return listenerId;
				
			} else {
				// error
				console.log("[network.js] addNetworkStateChangeListener error " + message.code);
				cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		//	void removeNetworkStateChangeListener(unsigned long listenerId);
		removeNetworkStateChangeListener : function(listenerId){
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "removeNetworkStateChangeListener"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] removeNetworkStateChangeListener success ");
				ppNetwork.removeListenerById(NETWORK_STATUS_CHANGE, listenerId);
			} else {
				// error
                 console.log("[network.js] getActiveConnectionType error " + message.code);
                 cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		// DOMString getIp();
		getIp  : function() {
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "getIp"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] getIp message data " + message.data);
				return message.data;
			} else {
				// error
                console.log("[network.js] getIp error " + message.code);
                cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		isConnectedToGateway : function()
		{
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "isConnectedToGateway"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] isConnectedToGateway message data " + message.data);
				return message.data;
			} else {
				// error
                   console.log("[network.js] isConnectedToGateway error " + message.code);
                cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		getIpMode : function()
		{
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "getIpMode"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] getIpMode message data " + message.data);
				return message.data;
			} else {
				// error
                console.log("[network.js] getIpMode error " + message.code);
                cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		getSubnetMask : function()
		{
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "getSubnetMask"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] getSubnetMask message data " + message.data);
				return message.data;
			} else {
				// error
                console.log("[network.js] getSubnetMask error " + message.code);
                cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		getGateway : function()
		{
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "getGateway"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] getGateway message data " + message.data);
				return message.data;
			} else {
				// error
                console.log("[network.js] getGateway error " + message.code);
                cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		getMac  : function()
		{
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "getMac"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] getMac message data " + message.data);
				return message.data;
			} else {
				// error
                console.log("[network.js] getMac error " + message.code);
                 cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		getDns : function()
		{
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "getDns"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] getDns message data " + message.data);
				return message.data;
			} else {
				// error
                console.log("[network.js] getDns error " + message.code);
                 cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		getWiFiSsid : function()
		{
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "getWiFiSsid"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] getWiFiSsid message data " + message.data);
				return message.data;
			} else {
				// error
                console.log("[network.js] getWiFiSsid error " + message.code);
                cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		getWiFiSignalStrengthLevel  : function()
		{
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "getWiFiSignalStrengthLevel"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] getWiFiSignalStrengthLevel message data " + message.data);
				return message.data;
			} else {
				// error
                console.log("[network.js] getWiFiSignalStrengthLevel error " + message.code);
                cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		getWiFiSecurityMode : function()
		{
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "getWiFiSecurityMode"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] getWiFiSecurityMode message data " + message.data);
				return message.data;
			} else {
				// error
                console.log("[network.js] getWiFiSecurityMode error " + message.code);
                cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		getWiFiEncryptionType : function()
		{
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "getWiFiEncryptionType"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] getWiFiEncryptionType message data " + message.data);
				return message.data;
			} else {
				// error
                console.log("[network.js] getWiFiEncryptionType error " + message.code);
                cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		getSecondaryDns  : function()
		{
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "getSecondaryDns"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] getSecondaryDns message data " + message.data);
				return message.data;
			} else {
				// error
                console.log("[network.js] getSecondaryDns error " + message.code);
                  cdata = message.data;   
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		setDhcpOption60Field   : function(a)
		{
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "setDhcpOption60Field",
				vendor  : a
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] setDhcpOption60Field message data " + message.data);
				//return message.data;
			} else {
				// error
                console.log("[network.js] setDhcpOption60Field error " + message.code);
                cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		removeDhcpOption60Field   : function()
		{
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "removeDhcpOption60Field"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] removeDhcpOption60Field message data " + message.data);
				//return message.data;
			} else {
				// error
                console.log("[network.js] removeDhcpOption60Field error " + message.code);
                cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		getCurrentDhcpOption60Field   : function()
		{
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "getCurrentDhcpOption60Field"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] getCurrentDhcpOption60Field message data " + message.data);
				return message.data;
			} else {
				// error
                console.log("[network.js] getCurrentDhcpOption60Field error " + message.code);
                 cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
		checkCurrentIpWith60Field : function()
		{
			ppNetwork = ppNetwork || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppNetwork.postMessageAndAwaitResponse({
				command : "checkCurrentIpWith60Field"
			});

			if (message.code == 0) {
				// success
				console.log("[network.js] checkCurrentIpWith60Field message data " + message.data);
				return message.data;
			} else {
				// error
                    console.log("[network.js] checkCurrentIpWith60Field error " + message.code);
                    cdata = message.data;
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		}
	};
})(this);

(function(window) {
	var MOD_NAME = "bluetooth";
	var INSTANTIATED_NAMESPACE = "bluetooth";
	var PEPPER_PLUGIN_NAME = "bluetooth";
	if (!window.webapis) {
		throw "Module " + MOD_NAME + ": window.webapis is not defined";
	}
var ppBluetooth = null;
	var BLUETOOTH_STATUS_CHANGE  = "BLUETOOTH_STATUS_CHANGE";

window.webapis[INSTANTIATED_NAMESPACE] = {
		
		// DOMString getVersion();
	getVersion : function() {
		console.log("[bluetooth.js] getVersion");
		ppBluetooth = ppBluetooth || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
		console.log("[bluetooth.js] ppBluetooth"+typeof(ppBluetooth));
		var message = ppBluetooth.postMessageAndAwaitResponse({
			command : "getVersion"
		});

		if (message.code == 0) {
			// success
			console.log("[bluetooth.js] getVersion message data " + message.data);
			return message.data;
		} else {
			// error
			console.log("[bluetooth.js] getVersion error " + message.code);
			throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
		}
	},
	getTEST  : function() 
	{
		ppBluetooth = ppBluetooth || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

		var message = ppBluetooth.postMessageAndAwaitResponse({
			command : "GetTEST"
		});

		if (message.code == 0) {
			// success
			console.log("[bluetooth.js] GetTEST message data " + message.data);
			return message.data;
		} else {
			// error
			console.log("[bluetooth.js] GetTEST error " + message.code);
			throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
		}
	},	
	GetSCStatus  : function() 
	{
		ppBluetooth = ppBluetooth || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

		var message = ppBluetooth.postMessageAndAwaitResponse({
			command : "GetSCStatus"
		});

		if (message.code == 0) {
			// success
			console.log("[bluetooth.js] GetSCStatus message data " + message.data);
			return message.data;
		} else {
			// error
			console.log("[bluetooth.js] GetSCStatus error " + message.code);
			throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
		}
	},	
	RegisterSixAxisCallback  : function(listener)
	{
		ppBluetooth = ppBluetooth || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

		var message = ppBluetooth.postMessageAndAwaitResponse({
			command : "RegisterSixAxisCallback"
		});

		if (message.code == 0) {
			// success
			console.log("[bluetooth.js] RegisterSixAxisCallback message data " + message.data);
			var listenerId = ppBluetooth.addListener(BLUETOOTH_STATUS_CHANGE, function(msg) {
					listener(msg.data.result);
				});
				console.log("[bluetooth.js] listenerId " + listenerId);
			return listenerId;
		} else {
			// error
			console.log("[bluetooth.js] RegisterSixAxisCallback error " + message.code);
			throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
		}
	},	
	UnRegisterSixAxisCallback  : function(listenerId)
	{
		ppBluetooth = ppBluetooth || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

		var message = ppBluetooth.postMessageAndAwaitResponse({
			command : "UnRegisterSixAxisCallback"
		});

		if (message.code == 0) {
			// success
			console.log("[bluetooth.js] UnRegisterSixAxisCallback message data " + message.data);
			ppBluetooth.removeListenerById(BLUETOOTH_STATUS_CHANGE, listenerId);
			
		} else {
			// error
			console.log("[bluetooth.js] UnRegisterSixAxisCallback error " + message.code);
			throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
		}
	}
};
})(this);
(function(window) {
	var MOD_NAME = "Microphone";
	var INSTANTIATED_NAMESPACE = "microphone";
	var PEPPER_PLUGIN_NAME = "microphone";
	if (!window.webapis) {
		throw "Module " + MOD_NAME + ": window.webapis is not defined";
	}

	var EVENT_FROM_MANAGER = "EventFromManager";
	var EVENT_FROM_DEVICE = "MicrophoneDeviceCallback";
	var ppMicro = null;

	var getPlugin = function() {
		if (null != ppMicro) {
			return ppMicro;
		}

		// Begin init pepper plugin
		ppMicro = window.webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
		if (null == ppMicro) {
			console.log("[microphone.js]  init pepper plugin error ");
			return null;
		}

		// Begin RegisterCallback
		var message = ppMicro.postMessageAndAwaitResponse({
			command : "RegisterCallback"
		});
		if (message.code == 0) {
			ppMicro.addListener(EVENT_FROM_MANAGER, window.webapis.microphone._handlerMicConnectMessage);
		} else {
			console.log("[ppMicrophone.js] RegisterManagerCallback message.code != 0");
		}
		
		return ppMicro;
	};

	var exec = function(api) {
		ppMicro = getPlugin();

		var message = ppMicro.postMessageAndAwaitResponse({
			command : api
		});
		
		if (message.code == 0) {
			// success
			return message.data;
		} else {
			// error
			throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
		}
	};

	window.webapis[INSTANTIATED_NAMESPACE] = {

		// MicrophoneDeviceEventType
		EVENT_DEVICE_CONNECT : 11,
		EVENT_DEVICE_DISCONNECT : 12,

		// MicrophoneSampleRateValue
		MICROPHONE_SAMPLE_RATE_48000 : 48000,
		MICROPHONE_SAMPLE_RATE_44100 : 44100,
		MICROPHONE_SAMPLE_RATE_32000 : 32000,
		MICROPHONE_SAMPLE_RATE_16000 : 16000,
		MICROPHONE_SAMPLE_RATE_8000 : 8000,

		// MicrophoneEffectValue
		MICROPHONE_EFFECT_NONE : 0x00,
		MICROPHONE_EFFECT_REVERB : 0x01,
		MICROPHONE_EFFECT_FILTER : 0x10,

		// MicrophoneStateValue
		MICROPHONE_STATUS_STOP : 0x00000000,
		MICROPHONE_STATUS_PLAY : 0x00000001,
		MICROPHONE_STATUS_RECORD : 0x00000010,
		MICROPHONE_STATUS_FILTER : 0x00000100,

		// MicrophoneDeviceAudioFormat
		MICROPHONE_FORMAT_SIGNED_16BIT_LITTLE_ENDIAN : 0,
		MICROPHONE_FORMAT_SIGNED_16BIT_BIG_ENDIAN_FORMAT : 1,

		// MICROPHONE_AUDIOINPUT_EVENT
		MICROPHONE_AUDIOINPUT_PLAY_FAIL : 400, // /< AudioInput Device Event for Play-fail
		MICROPHONE_AUDIOINPUT_DATA : 401, // /< AudioInput Device Event for Read
		MICROPHONE_AUDIOINPUT_RECORD_FAIL : 402, // /< AudioInput Device Event for Record-fail
		MICROPHONE_AUDIOINPUT_RECORD_STOP : 403, // /< AudioInput Device Event for Record stop due to the effect setting
		MICROPHONE_AUDIOINPUT_FILTER_VOICE_DETECTED : 404, // /< AudioInput Device Event for voice detection
		MICROPHONE_AUDIOINPUT_FILTER_PLAY_START : 405, // /< AudioInput Device Event for filter play started
		MICROPHONE_AUDIOINPUT_FILTER_PLAY_STOP : 406, // /< AudioInput Device Event for filter play stopped
		MICROPHONE_AUDIOINPUT_FILTER_SILENCE_DETECTED : 407, // /< AudioInput Device Event for silence detection
		MICROPHONE_AUDIOINPUT_FILTER_PLAY_VOLUME : 450, // /< AudioInput Device Event for filter play volume
	
		// public

		// private
		OCI_OK : 0,
		OCI_NO_ERR : 0,
		OCI_ERR : 9999,
		DELIMITER_EVENT_PARAM : ",",

		OCIDevInfo : function() {
			var uid;
			var name;
			var eventType;
			var deviceType;
			var isFree;
		},

		callbackCount : 0,

		connectCallbackArr : [],

		connectCallback : function(listenerId, callback) {
			this.id = listenerId;
			this.callback = callback;
		},

		_addConnectCallback : function(listenerId, callback) {
			var callback = new window.webapis[INSTANTIATED_NAMESPACE].connectCallback(listenerId, callback);
			this.connectCallbackArr.push(callback);
		},

		_removeConnectCallbackById : function(id) {
			for (i = 0; i < this.connectCallbackArr.length; i++) {
				if (this.connectCallbackArr[i].id == id) {
					var obj = this.connectCallbackArr[i];
					this.connectCallbackArr.splice(i, 1);
					return obj;
				}
			}
			return null;
		},
		// private

		MicrophoneArray : new Array(),
		MicrophoneValidArray : new Array(),
		IsVoiceRecognition : true,

		MicrophoneManagerEvent : function() {
			var eventType;
			var name;
			var uid;
		},

		/***********************************************************************************************************************************************************************************************
		 * 
		 * 
		 * Changed OCI Apis
		 * 
		 * 
		 **********************************************************************************************************************************************************************************************/
		_handlerMicConnectMessage : function(msg) {
			var connectEvent = msg.data.data;
			
			switch (connectEvent.eventType) {
				case window.webapis[INSTANTIATED_NAMESPACE].EVENT_DEVICE_CONNECT:
					for (var i = 0; i < window.webapis[INSTANTIATED_NAMESPACE].connectCallbackArr.length; i++) {
						window.webapis[INSTANTIATED_NAMESPACE].connectCallbackArr[i].callback(connectEvent);
					}
					break;

				case window.webapis[INSTANTIATED_NAMESPACE].EVENT_DEVICE_DISCONNECT:
					for (var i = 0; i < window.webapis[INSTANTIATED_NAMESPACE].connectCallbackArr.length; i++) {
						window.webapis[INSTANTIATED_NAMESPACE].connectCallbackArr[i].callback(connectEvent);
					}

					for (var nCount = 0; nCount < window.webapis.microphone.MicrophoneArray.length; nCount++) {
						var nDevice = window.webapis.microphone.MicrophoneArray[nCount];
						uniqueID = nDevice.getUniqueId();
						if (uniqueID == connectEvent.uid) {
							nDevice.stop(window.webapis.microphone.MICROPHONE_STATUS_PLAY | window.webapis.microphone.MICROPHONE_STATUS_RECORD);
							nDevice.disableDevice();
						}
					}
					window.webapis.microphone.removeSpecificDevice(connectEvent.uid, window.webapis.microphone.MicrophoneArray, window.webapis.microphone.MicrophoneValidArray);
					break;

				default:
					console.log("[microphone.js]unknow event :  " + connectEvent.eventType);
					break;
			}

		},

		create : function() {
			if (ppMicro != null) {
				ppMicro = getPlugin();
				if (this.getConnectedDeviceInfo(0) == window.webapis.microphone.OCI_ERR) {
					return window.webapis.microphone.OCI_ERR;
				}
			} else {
				return window.webapis.microphone.OCI_ERR;
			}
		},

		isConnected : function(uid) {
			if (!window.webapis._checkTypeValid("DOMString", uid)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'uid' parameter");
			}

			ppMicro = getPlugin();

			var message = ppMicro.postMessageAndAwaitResponse({
				command : "IsConnected",
				uid : uid
			});

			if (message.code == 0) {
				// success
				return message.data;
			} else {
				// error
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},

		getConnectedDeviceInfo : function(order) {
			ppMicro = getPlugin();

			var message = ppMicro.postMessageAndAwaitResponse({
				command : "GetConnectedDeviceInfo",
				uid : order
			});

			if (message.code == 0) {
				// gamepadInfo
				return message.data;
			} else {
				return null;
			}
		},

		parseDeviceEvent : function(sParam) {
			var event = sParam.split(window.webapis.microphone.DELIMITER_EVENT_PARAM);
			if (event != null) {
				var deviceEvent = new window.webapis.microphone.OCIDevInfo();
				deviceEvent.eventType = Number(event[0]);
				deviceEvent.uid = String(event[1]);
				deviceEvent.name = String(event[2]);
				deviceEvent.deviceType = Number(event[5]);

				return deviceEvent;
			}
			return null;
		},

		isAvailable : function(uniqueID, arrayDevice, arrayValid) {
			
			for (var nCount = 0; nCount < arrayDevice.length; nCount++) {
				if (arrayDevice[nCount].getUniqueId() == uniqueID) {
					arrayValid[nCount] = true;
					return nCount;
				}
			}
			return null;
		},

		removeSpecificDevice : function(uniqueID, arrayDevice, arrayValid) {
			var arrayID = this.isAvailable(uniqueID, arrayDevice, arrayValid);
			if (arrayID != null) {
				var deviceID = arrayDevice[arrayID].getDeviceId();
				delete arrayDevice[arrayID];
				this._destroyDevice(deviceID);
				arrayDevice.splice(arrayID, 1);
				arrayValid.splice(arrayID, 1);
			}
		},

		removeDevices : function(arrayDevice, arrayValid) {
			if (arrayValid.length) {
				for (var iCount = arrayValid.length - 1; iCount >= 0; iCount--) {
					if (arrayValid[iCount] == false) {
						this._destroyDevice(arrayDevice[iCount].getDeviceId());
						arrayDevice.splice(iCount, 1);
						arrayValid.splice(iCount, 1);
					}
				}
			}
		},

		getConnectedDevices : function(arrayDevice, arrayValid, successCallback, classDevice) {
			for (var iCount = 0; iCount < arrayDevice.length; iCount++) {
				arrayValid[iCount] = false;
			}
			var iNum = 0;
			while (1) {
				var saDevInfo = null;
				saDevInfo = this.getConnectedDeviceInfo(iNum++);
				if (saDevInfo == null) {
					break;
				}
				if (this.isAvailable(saDevInfo.uid, arrayDevice, arrayValid) == null) {
					var iDeviceID = this._createDevice(saDevInfo.uid);
					if (iDeviceID != this.OCI_ERR) {
						var newDevice = new classDevice(saDevInfo, iDeviceID);
						arrayDevice.push(newDevice);
					}
				}
			}

			this.removeDevices(arrayDevice, arrayValid);
			successCallback(arrayDevice);
		},

		setFilePath : function(filepath) {
			var smartHubFull = window.location.search.split('modelid=');
			var smartHubModel = smartHubFull[1].split('&');

			// check filepath is valid
			var filename = filepath.substring(7, filepath.length);

			var preFilename = filepath.substring(0, 7);
			preFilename = preFilename.toLowerCase();
			if (preFilename != 'file://') {
				if (preFilename == 'http://') {
					return filepath;
				} else if (smartHubModel[0] != 'SDK' && preFilename == 'usb://s') {
					filename = '/dtv/usb/' + filepath.substring(6, filepath.length);
					return filename;
				}
				return null;
			}

			if (filename[0] == '/' || filename.search(':') != -1 || filename.indexOf("..") != -1) {
				console.log("webapis :: absolute filepath is not supported");
				return null;
			}

			// get app. filepath
			var strLocalPath = window.location.pathname;

			var widgetPath;
			if (smartHubModel[0] == 'SDK') {
				var platformName = window.navigator.platform;
				if (platformName.indexOf("Linux") != -1) {
					widgetPath = "Apps" + '/' + curWidget.id;
				} else {
					widgetPath = "apps" + '/' + curWidget.id;
				}
			} else {
				widgetPath = curWidget.id;
			}
			var deleteIndex = strLocalPath.indexOf(widgetPath);
			if (deleteIndex != -1) {
				var pFilePath = strLocalPath.substring(0, deleteIndex) + widgetPath;
				if (smartHubModel[0] != 'SDK') {
					if (webapis._plugin("FileSystem", "IsExistedPath", pFilePath + "_img")) {
						pFilePath = pFilePath + "_img";
					}
				}
				pFilePath = decodeURI(pFilePath + '/' + filename);

				return pFilePath;
			}
			return null;
		},

		destroy : function() {
		},

		/***********************************************************************************************************************************************************************************************
		 * 
		 * 
		 * microphone Apis
		 * 
		 * 
		 **********************************************************************************************************************************************************************************************/
		isSupported : function() {
			return true;
		},

		getMicrophones : function(successCallback, errorCallback) {
			if (!window.webapis._checkTypeValid("function", successCallback)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError",
						"Invalid SuccessCallback type passed for 'successCallback' parameter");
			}
			if (errorCallback && !window.webapis._checkTypeValid("function", errorCallback)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid errorCallback type passed for 'errorCallback' parameter");
			}

			var timeout = 1;
			setTimeout(function() {
				webapis.microphone.getConnectedDevices(webapis.microphone.MicrophoneArray, webapis.microphone.MicrophoneValidArray, successCallback, webapis.microphone.MicrophoneDevice);
			}, timeout);
		},

		addMicrophoneConnectListener : function(listener) {
			if (!window.webapis._checkTypeValid("function", listener)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid function type passed for 'listener' parameter");
			}

			var listenerId = this.callbackCount++;
			this._addConnectCallback(listenerId, listener);
			console.log("[ppMicrophone.js] addMicrophoneConnectListener listenerId: " + listenerId);
			return listenerId;
		},

		removeMicrophoneConnectListener : function(listenerId) {
			if (!window.webapis._checkTypeValid("long", listenerId)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'listenerId' parameter");
			}

			var callback = this._removeConnectCallbackById(listenerId);
			if (null == callback) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.NOT_FOUND_ERR, "NotFoundError", "Can not find Listener by this listenerId [" + listenerId + "]");
				return;
			}
		},

		_createDevice : function(uid) {
			ppMicro = getPlugin();

			var message = ppMicro.postMessageAndAwaitResponse({
				command : "CreateMicrophone",
				uid : uid
			});

			if (message.code == 0) {
				return message.data;
			} else {
				return null;
			}
		},

		_destroyDevice : function(deviceId) {
			ppMicro = getPlugin();
			var message = ppMicro.postMessageAndAwaitResponse({
				command : "DestroyMicrophone",
				microphoneId : deviceId
			});
			
			if (message.code == 0) {
				// success
				console.log("[microphone.js]: _destroyDevice ");
				return;
			} else {
				// error
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},

		/***********************************************************************************************************************************************************************************************
		 * 
		 * 
		 * Microphone object
		 * 
		 * 
		 **********************************************************************************************************************************************************************************************/
		MicrophoneDevice : function(devInfo, deviceID) {
			INTERFACE_COMMAND = "Microphone";
			this.uid = devInfo.uid;
			this.name = devInfo.name;
			this.deviceId = deviceID;
			this.deviceCallback = null;
			this.deviceType = devInfo.deviceType;

			this.getUniqueId = function() {
				return this.uid;
			}

			this.getDeviceId = function() {
				return this.deviceId;
			}

			this.getName = function() {
				return this.name;
			}

			this.enableDevice = function(format, sampleRate) {
				if (!window.webapis._checkTypeValid("long", format)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'format' parameter");
				}
				if (!window.webapis._checkTypeValid("long", sampleRate)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'sampleRate' parameter");
				}

				var ret;
				ppMicro = getPlugin();

				var message = ppMicro.postMessageAndAwaitResponse({
					command : "EnableAudioIn",
					deviceID : this.deviceId,
					format : format,
					framerate : sampleRate,
				});

				if (message.code == 0) {
					ret = message.data;
				}

				if (ret != webapis.microphone.OCI_NO_ERR) {
					console.log("[OCI_microphone_enable]: ERROR = " + ret);
					return false;
				}
				return true;
			}

			this.disableDevice = function() {
				var ret;
				ppMicro = getPlugin();

				var message = ppMicro.postMessageAndAwaitResponse({
					command : "DisableAudioIn",
					deviceID : this.deviceId,
				});

				if (message.code == 0) {
					ret = message.data;
				}

				if (ret != webapis.microphone.OCI_NO_ERR) {
					console.log("[OCI_microphone_disable]: ERROR = " + ret);
					return false;
				}
				return true;
			}

			this.playRecord = function(state, fileName, lockState) {
				if (state && !window.webapis._checkTypeValid("long", state)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'state' parameter");
				}
				if (fileName && !window.webapis._checkTypeValid("DOMString", fileName)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'fileName' parameter");
				}
				if (lockState && !window.webapis._checkTypeValid("boolean", lockState)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'lockState' parameter");
				}

				if (typeof state == "undefined") {
					state = webapis.microphone.MICROPHONE_STATUS_PLAY;
				}
				if (typeof lockState == "undefined") {
					lockState = true;
				}
				if (typeof fileName == "undefined") {
					fileName = "";
				}

				ppMicro = getPlugin();
				var result;
				var message = ppMicro.postMessageAndAwaitResponse({
					command : "PlayAudioIn",
					deviceID : this.deviceId,
					strLockState : lockState,
					nState : state,
					strFilename : fileName,
				});

				if (message.code == 0) {
					result = message.data;
				}

				var ret = false;
				if (result == webapis.microphone.OCI_NO_ERR) {
					ret = true;
				}
				/*
				 * if(ret==true && webapis.recognition.IsVoiceRecognitionEnabled()){ webapis.recognition.HideVoiceHelpbar(); webapis.recognition.StopVoiceRecognition(); IsVoiceRecognition = true; }
				 */
				return ret;
			}

			this.stop = function(state) {
				if (state && !window.webapis._checkTypeValid("long", state)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'state' parameter");
				}

				if (typeof state == "undefined") {
					state = webapis.microphone.MICROPHONE_STATUS_PLAY;
				}

				ppMicro = getPlugin();
				var result;
				var message = ppMicro.postMessageAndAwaitResponse({
					command : "StopAudioIn",
					deviceID : this.deviceId,
					nState : state
				});

				if (message.code == 0) {
					result = message.data;
				}

				var ret = false;
				if (result == webapis.microphone.OCI_NO_ERR) {
					ret = true;
				}
				/*
				 * if(IsVoiceRecognition == true){ webapis.recognition.StartVoiceRecognition(); IsVoiceRecognition = false; }
				 */
				return ret;
			}

			this.play = function(lockState) {
				if (lockState && !window.webapis._checkTypeValid("boolean", lockState)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'lockState' parameter");
				}

				if (typeof lockState == "undefined") {
					lockState = true;
				}

				var ret = this.playRecord(webapis.microphone.MICROPHONE_STATUS_PLAY, "", lockState);
				if (ret == false) {
					console.log("play ERROR = " + ret);
				}
				return ret;
			}

			this.stopPlay = function() {
				var ret = this.stop(webapis.microphone.MICROPHONE_STATUS_PLAY);
				if (ret == false) {
					console.log("stopPlay ERROR = " + ret);
				}
				return ret;
			}

			this.record = function(fileName) {
				if (!window.webapis._checkTypeValid("DOMString", fileName)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'fileName' parameter");
				}

				ppMicro = getPlugin();
				var result;
				var message = ppMicro.postMessageAndAwaitResponse({
					command : "GetVersion"
				});

				if (message.code == 0) {
					result = message.data;
				}
				var ret = false;
				if (typeof fileName != "undefined") {
					if (Number(result) >= 2.0) {
						fileName = webapis.microphone.setFilePath(fileName);
						if (fileName != null) {
							ret = this.playRecord(webapis.microphone.MICROPHONE_STATUS_RECORD, fileName, true);
						}
					}
					if (ret == false) {
						console.log("record ERROR = " + ret);
					}
				}
				return ret;
			}

			this.stopRecord = function() {
				ppMicro = getPlugin();
				var result;
				var message = ppMicro.postMessageAndAwaitResponse({
					command : "GetVersion"
				});

				if (message.code == 0) {
					result = message.data;
				}

				var ret = false;
				if (Number(result) >= 2.0) {
					ret = this.stop(webapis.microphone.MICROPHONE_STATUS_RECORD);
				}
				if (ret == false) {
					console.log("stopRecord ERROR = " + ret);
				}
				return ret;
			}

			this.getVolumeLevel = function() {
				ppMicro = getPlugin();
				var ret;
				var message = ppMicro.postMessageAndAwaitResponse({
					command : "GetAudioInVolumeLevel",
					deviceID : this.deviceId
				});

				if (message.code == 0) {
					ret = message.data;
				}
				return ret;
			}

			this.setVolumeLevel = function(volume) {
				if (!window.webapis._checkTypeValid("long", volume)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'volume' parameter");
				}

				ppMicro = getPlugin();
				var ret;
				var message = ppMicro.postMessageAndAwaitResponse({
					command : "SetAudioInVolumeLevel",
					deviceID : this.deviceId,
					volume : volume,
				});

				if (message.code == 0) {
					ret = message.data;
				}

				if (ret != webapis.microphone.OCI_NO_ERR) {
					console.log("setVolumeLevel function only work while playing");
					return false;
				}
				return true;
			}

			this.getSupportedEffect = function() {
				ppMicro = getPlugin();
				var ret;
				var message = ppMicro.postMessageAndAwaitResponse({
					command : "GetSupportedAudioInEffects",
					deviceID : this.deviceId
				});

				if (message.code == 0) {
					ret = message.data;
				}
				return ret;
			}

			this.getEnabledEffect = function() {
				ppMicro = getPlugin();
				var ret;
				var message = ppMicro.postMessageAndAwaitResponse({
					command : "GetEnabledAudioInEffects",
					deviceID : this.deviceId
				});

				if (message.code == 0) {
					ret = message.data;
				}
				return ret;
			}

			this.setEffect = function(effect, enable, tempo, pitch, rate, threshold, noduration) {
				if (!window.webapis._checkTypeValid("long", effect)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'effect' parameter");
				}
				if (!window.webapis._checkTypeValid("boolean", enable)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid boolean type passed for 'enable' parameter");
				}

				if (tempo && !window.webapis._checkTypeValid("long", tempo)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'tempo' parameter");
				}
				if (pitch && !window.webapis._checkTypeValid("long", pitch)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'pitch' parameter");
				}
				if (rate && !window.webapis._checkTypeValid("long", rate)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'rate' parameter");
				}
				if (threshold && !window.webapis._checkTypeValid("long", threshold)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'threshold' parameter");
				}
				if (noduration && !window.webapis._checkTypeValid("long", noduration)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'noduration' parameter");
				}

				var enableFlag = 0;
				if (enable == true) {
					enableFlag = 1;
				} else {
					enableFlag = 0;
				}
				if (typeof tempo == "undefined") {
					tempo = 0;
				}
				if (typeof pitch == "undefined") {
					pitch = 0;
				}
				if (typeof rate == "undefined") {
					rate = 0;
				}
				if (typeof threshold == "undefined") {
					threshold = "";
				}
				if (typeof noduration == "undefined") {
					noduration = "";
				}

				ppMicro = getPlugin();
				var param = String(tempo) + ',' + String(pitch) + ',' + String(rate) + ',' + String(threshold) + ',' + String(noduration);
				console.log("param: " + param);
				var ret;
				var message = ppMicro.postMessageAndAwaitResponse({
					command : "SetAudioInEffect",
					deviceID : this.deviceId,
					effect : effect,
					enableFlag : enableFlag,
					strParam : param
				});
				
				if (message.code == 0) {
					ret = message.data;
				}

				if (ret == webapis.microphone.OCI_NO_ERR) {
					return true;
				}
				return false;
			}

			this.registerDeviceCallback = function(callback) {
				if (typeof callback == 'function') {
					this.deviceCallback = callback;

					ppMicro = getPlugin();
					var ret;
					var message = ppMicro.postMessageAndAwaitResponse({
						command : "RegisterCallback"
					});

					if (message.code == 0) {
						ret = message.data;
					}
				} else {
					// console.log("[microphone_registerDeviceCallback]_UnregisterCallback
					// ");
					this.deviceCallback = null;

					ppMicro = getPlugin();
					var ret;
					var message = ppMicro.postMessageAndAwaitResponse({
						command : "UnregisterCallback"
					});

					if (message.code == 0) {
						ret = message.data;
					}
				}
			}

			this.getFilterVolume = function() {
				ppMicro = getPlugin();
				var ret;
				var message = ppMicro.postMessageAndAwaitResponse({
					command : "GetFilterVolume",
					deviceID : this.deviceId
				});

				if (message.code == 0) {
					ret = message.data;
				}
				return ret;
			}

			this.addMicrophoneEventListener = function(listener) {
				var listenerId = -1;

				if (!window.webapis._checkTypeValid("function", listener)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid function type passed for 'listener' parameter");
				}

				ppMicro = getPlugin();
				var message = ppMicro.postMessageAndAwaitResponse({
					command : "RegisterMicrophoneCallback",
					microphoneId : this.deviceId
				});

				if (message.code == 0) {
					// success
					listenerId = ppMicro.addListener(EVENT_FROM_DEVICE, function(msg) {
						var eventMsg = msg.data.data;
						console.log("vvvvvvvvvvvvvvvvvvvvvvvvvvvvvv" + eventMsg);
						listener(eventMsg);
					});
				} else {
					// error
					throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
				}
				return listenerId;
			};
			
			this.removeMicrophoneEventListener = function(listenerId) {
				if (!window.webapis._checkTypeValid("long", listenerId)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'listenerId' parameter");
				}
				
				ppMicro = getPlugin();
				var message = ppMicro.postMessageAndAwaitResponse({
					command : "UnregisterMicrophoneCallback",
					microphoneId : this.deviceId
				});

				if (message.code == 0) {
					// success
					var flag = ppMicro.removeListenerById(EVENT_FROM_DEVICE , listenerId);
					console.log("removeListenerById " + flag);
					return;
				} else {
					// error
					throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
				}
			};


		},

		/***********************************************************************************************************************************************************************************************
		 * 
		 * 
		 * Pepper Apis
		 * 
		 * 
		 **********************************************************************************************************************************************************************************************/

		getVersion : function() {
			return exec("getVersion");
		},

	};
})(this);

(function(window) {
	var MOD_NAME = "Gamepad";
	var INSTANTIATED_NAMESPACE = "gamepad";
	var PEPPER_PLUGIN_NAME = "gamepad";
	if (!window.webapis) {
		throw "Module " + MOD_NAME + ": window.webapis is not defined";
	}

	var EVENT_FROM_MANAGER = "EventFromManager";

	var ppGamepad = null;
	var getPlugin = function() {
		if (null != ppGamepad) {
			return ppGamepad;
		}

		// Begin init pepper plugin
		ppGamepad = window.webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
		if (null == ppGamepad) {
			console.log("[gamepad.js]  init pepper plugin error ");
			return null;
		}

		// Begin RegisterCallback
		var message = ppGamepad.postMessageAndAwaitResponse({
			command : "RegisterCallbackGamepadManager"
		});
		if (message.code == 0) {
			ppGamepad.addListener(EVENT_FROM_MANAGER, window.webapis[INSTANTIATED_NAMESPACE]._handlerGamepadConnectMessage);
		} else {
			console.log("[gamepad.js] RegisterManagerCallback message.code != 0");
		}
		
		return ppGamepad;
	};

	window.webapis[INSTANTIATED_NAMESPACE] = {

		/*
		 * Constant: GAMEPAD_MANAGER_EVENT MGR_EVENT_DEV_CONNECT - connection event MGR_EVENT_DEV_DISCONNECT - disconnection event
		 */
		EVENT_DEVICE_CONNECT : 11,
		EVENT_DEVICE_DISCONNECT : 12,

		// Event type : The input-event type of the gamepad device.
		/*
		 * Constant: GAMEPAD_EVENT_TYPE EV_KEY - Key Event EV_ABS - ABS Event
		 */
		EV_KEY : 0x01,
		EV_ABS : 0x03,

		// ABS Code : The input-event code of the gamepad device.
		/*
		 * Constant: GAMEPAD_ABS_CODE ABS_X - X axis ABS_Y - Y axis ABS_Z - Z axis ABS_RX - X rotation ABS_RY - Y rotation ABS_RZ - Z rotation ABS_THROTTLE - Throttle ABS_RUDDER - Rudder ABS_WHEEL -
		 * Wheel ABS_GAS - Gas ABS_BRAKE - Brake ABS_HAT0X - HAT0 X axis ABS_HAT0Y - HAT0 Y axis ABS_HAT1X - HAT1 X axis ABS_HAT1Y - HAT1 Y axis ABS_HAT2X - HAT2 X axis ABS_HAT2Y - HAT2 Y axis
		 * ABS_HAT3X - HAT3 X axis ABS_HAT3Y - HAT3 Y axis
		 */
		ABS_X : 0x00,
		ABS_Y : 0x01,
		ABS_Z : 0x02,
		ABS_RX : 0x03,
		ABS_RY : 0x04,
		ABS_RZ : 0x05,
		ABS_THROTTLE : 0x06,
		ABS_RUDDER : 0x07,
		ABS_WHEEL : 0x08,
		ABS_GAS : 0x09,
		ABS_BRAKE : 0x0A,
		ABS_HAT0X : 0x10,
		ABS_HAT0Y : 0x11,
		ABS_HAT1X : 0x12,
		ABS_HAT1Y : 0x13,
		ABS_HAT2X : 0x14,
		ABS_HAT2Y : 0x15,
		ABS_HAT3X : 0x16,
		ABS_HAT3Y : 0x17,

		// Button(Key) Code
		/*
		 * Constant: GAEPAD_BUTTON_CODE BTN_1 - Button #1, A BTN_2 - Button #2, B BTN_3 - Button #3, X BTN_4 - Button #4, Y BTN_5 - Button #5, LB BTN_6 - Button #6, RB BTN_7 - Button #7, BACK BTN_8 -
		 * Button #8, START BTN_9 - Button #9, Left Stick BTN_10 - Button #10, Right Stick BTN_11 - Button #11 BTN_12 - Button #12 BTN_13 - Button #13 BTN_14 - Button #14 BTN_15 - Button #15 BTN_16 -
		 * Button #16
		 */
		BTN_1 : 0x00,
		BTN_2 : 0x01,
		BTN_3 : 0x02,
		BTN_4 : 0x03,
		BTN_5 : 0x04,
		BTN_6 : 0x05,
		BTN_7 : 0x06,
		BTN_8 : 0x07,
		BTN_9 : 0x08,
		BTN_10 : 0x09,
		BTN_11 : 0x0A,
		BTN_12 : 0x0B,
		BTN_13 : 0x0C,
		BTN_14 : 0x0D,
		BTN_15 : 0x0E,
		BTN_16 : 0x0F,

		// ABS Values : The input-event value of the gamepad device.
		/*
		 * Constant: GAMEPAD_ABS_VALUE MAX_ABS_VALUE - Maximum ABS value MIN_ABS_VALUE - Minimum ABS value XINPUT_MAX_ABS_VALUE - Maximum ABS value of XInput XINPUT_MIN_ABS_VALUE - Minimum ABS value
		 * of XInput
		 */
		MAX_ABS_VALUE : 255,
		MIN_ABS_VALUE : 0,

		XINPUT_MAX_ABS_VALUE : 32767,
		XINPUT_MIN_ABS_VALUE : -32768,

		// key status value
		/*
		 * Constant: GAMEPAD_KEY_STATUS KEY_PRESSED - Pressed status KEY_RELEASED - Released status KEY_REPEATED - Continous pressed status
		 */
		KEY_RELEASED : 0,
		KEY_PRESSED : 1,
		KEY_REPEATED : 2,

		GamepadArray : new Array(),
		GamepadValidArray : new Array(),

		callbackCount : 0,
		connectCallbackArr : [],

		connectCallback : function(listenerId, callback) {
			this.id = listenerId;
			this.callback = callback;
		},

		_addConnectCallback : function(listenerId, callback) {
			var callback = new window.webapis[INSTANTIATED_NAMESPACE].connectCallback(listenerId, callback);
			this.connectCallbackArr.push(callback);
		},

		_removeConnectCallbackById : function(id) {
			for (i = 0; i < this.connectCallbackArr.length; i++) {
				if (this.connectCallbackArr[i].id == id) {
					var obj = this.connectCallbackArr[i];
					this.connectCallbackArr.splice(i, 1);
					return obj;
				}
			}
			return null;
		},

		_handlerGamepadConnectMessage : function(msg) {
			var connectEvent = msg.data.data;
			
			switch (connectEvent.eventType) {
			case window.webapis[INSTANTIATED_NAMESPACE].EVENT_DEVICE_CONNECT:
				for (var i = 0; i < window.webapis[INSTANTIATED_NAMESPACE].connectCallbackArr.length; i++) {
					window.webapis[INSTANTIATED_NAMESPACE].connectCallbackArr[i].callback(connectEvent);
				}
				break;

			case window.webapis[INSTANTIATED_NAMESPACE].EVENT_DEVICE_DISCONNECT:
				for (var i = 0; i < window.webapis[INSTANTIATED_NAMESPACE].connectCallbackArr.length; i++) {
					window.webapis[INSTANTIATED_NAMESPACE].connectCallbackArr[i].callback(connectEvent);
				}

				window.webapis.gamepad.removeSpecificDevice(connectEvent.uid, window.webapis.gamepad.GamepadArray, window.webapis.gamepad.GamepadValidArray);
				break;
			default:
				console.log("[gamepad.js]unknow event :  " + connectEvent.eventType);
				break;
			}
		},

		GamepadDevice : function(gamepadId, name, uid, deviceType) {

			this.deviceType = deviceType, this.uid = uid;
			this.name = name;
			this.gamepadId = gamepadId;

			this.getName = function() {
				return this.name;
			};

			this.getUniqueId = function() {
				return this.uid;
			};

			this.getGamepadId = function() {
				return this.gamepadId;
			};

			this.getInputEvent = function() {
				ppGamepad = getPlugin();
				var myid = this.gamepadId;
				var message = ppGamepad.postMessageAndAwaitResponse({
					command : "GetInputEvent",
					gamepadId : myid
				});
				if (message.code == 0) {
					// success
					console.log("[GamepadWidget]: getInputEvent  message.code == 0");
					return message.data;
				} else {
					// error
					return null;
				}
			};

			this.getInputEventEx = function(count) {
				// check param is func
				if (!window.webapis._checkTypeValid("long", count)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'count' parameter");
				}

				ppGamepad = getPlugin();
				var myid = this.gamepadId;
				var message = ppGamepad.postMessageAndAwaitResponse({
					command : "GetInputEventEx",
					count : count,
					gamepadId : myid
				});

				if (message.code == 0) {
					// success
					console.log("[GamepadWidget]: getInputEventEx  success");
					return message.data;
				} else {
					// error
					return null;
				}
			};

			this.isForceFeedbackSupported = function() {
				ppGamepad = getPlugin();
				var myid = this.gamepadId;
				var message = ppGamepad.postMessageAndAwaitResponse({
					command : "IsForceFeedbackSupported",
					gamepadId : myid
				});

				if (message.code == 0) {
					// success
					return true;
				} else {
					// error
					console.log("[GamepadWidget]: isForceFeedbackSupported  return true");
					return false;
				}
			};

			this.playForceFeedback = function(duration, gain) {
				if (duration && !window.webapis._checkTypeValid("long", duration)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'duration' parameter");
				}
				if (gain && !window.webapis._checkTypeValid("long", gain)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'gain' parameter");
				}

				if (typeof duration == "undefined") {
					duration = 1;
				}
				if (typeof gain == "undefined") {
					gain = 100;
				}

				ppGamepad = getPlugin();
				var myid = this.gamepadId;
				var message = ppGamepad.postMessageAndAwaitResponse({
					command : "PlayForceFeedback",
					gamepadId : myid,
					duration : duration,
					gain : gain
				});
				if (message.code == 0) {
					// success
					return true;
				} else {
					// error
					return false;
				}
			};

			this.stopForceFeedback = function() {
				ppGamepad = getPlugin();
				var myid = this.gamepadId;
				var message = ppGamepad.postMessageAndAwaitResponse({
					command : "StopForceFeedback",
					gamepadId : myid
				});

				if (message.code == 0) {
					// success
					return true;
				} else {
					// error
					return false;
				}
			};

			this.getAbsValueRange = function(code) {
				// check param is func
				if (!window.webapis._checkTypeValid("long", code)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'code' parameter");
				}

				ppGamepad = getPlugin();
				var myid = this.gamepadId;
				var message = ppGamepad.postMessageAndAwaitResponse({
					command : "GetABSValueRange",
					gamepadId : myid,
					code : code
				});

				if (message.code == 0) {
					// success
					return message.data;
				} else {
					// error
					throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
				}
			};

			this.setActive = function() {
				ppGamepad = getPlugin();
				var myid = this.gamepadId;
				var message = ppGamepad.postMessageAndAwaitResponse({
					command : "SetActive",
					gamepadId : myid
				});
				if (message.code == 0) {
					// success
					return true;
				} else {
					// error
					throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
				}
			};

			this.setInactive = function() {
				ppGamepad = getPlugin();
				var myid = this.gamepadId;
				var message = ppGamepad.postMessageAndAwaitResponse({
					command : "SetInactive",
					gamepadId : myid
				});
				if (message.code == 0) {
					// success
					return;
				} else {
					// error
					throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
				}
			};

			this.addGamepadEventListener = function(listener) {
				// check param is func
				if (!window.webapis._checkTypeValid("function", listener)) {
					throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid function type passed for 'listener' parameter");
				}

				ppGamepad = getPlugin();
				var myid = this.gamepadId;
				var message = ppGamepad.postMessageAndAwaitResponse({
					command : "RegisterGamepadCallback",
					gamepadId : myid
				});

				var listenerId = -1;

				if (message.code == 0) {
					// success
					listenerId = ppGamepad.addListener("GamepadDeviceCallback", function(msg) {
						console.log("vvvvvvvvvvvvvvvvvvvvvvvvvvvvvv" + msg.data.data.id);
						listener(msg.data.data.id, msg.data.data);
					});
					this.setActive();
					return listenerId;
				} else {
					// error
					throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
				}
			};

			this.removeGamepadEventListener = function(listenerId) {
				ppGamepad = getPlugin();
				var myid = this.gamepadId;
				var message = ppGamepad.postMessageAndAwaitResponse({
					command : "UnregisterCallback",
					gamepadId : myid
				});

				var listenerId = -1;

				if (message.code == 0) {
					// success
					return;
				} else {
					// error
					throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
				}
			};

		},

		_createDevice : function(uid) {
			ppGamepad = getPlugin();

			var message = ppGamepad.postMessageAndAwaitResponse({
				command : "CreateGamepad",
				uid : uid
			});

			if (message.code == 0) {
				return message.data;
			} else {
				return null;
			}
		},

		_destroyDevice : function(id) {
			ppGamepad = getPlugin();
			var myid = id;
			var messageUnregisterCallback = ppGamepad.postMessageAndAwaitResponse({
				command : "UnregisterCallback",
				gamepadId : myid
			});
			if (messageUnregisterCallback.code == 0) {
				// success
				console.log("[GamepadWidget]: _destroyDevice UnregisterCallback  success");
			} else {
				// error
				throw window.webapis._createWebAPIError(messageUnregisterCallback.code, messageUnregisterCallback.errorName, messageUnregisterCallback.errorMessage);
			}

			var messageSetInactive = ppGamepad.postMessageAndAwaitResponse({
				command : "SetInactive",
				gamepadId : myid
			});
			if (messageSetInactive.code == 0) {
				// success
				console.log("[GamepadWidget]: _destroyDevice setInactive  success");
			} else {
				// error
				throw window.webapis._createWebAPIError(messageSetInactive.code, messageSetInactive.errorName, messageSetInactive.errorMessage);
			}

			var message = ppGamepad.postMessageAndAwaitResponse({
				command : "DestroyDevice",
				gamepadId : myid
			});

			if (message.code == 0) {
				// success
				console.log("[GamepadWidget]: _destroyDevice  success");
				return;
			} else {
				// error
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},

		getVersion : function() {
			ppGamepad = getPlugin();
			var message = ppGamepad.postMessageAndAwaitResponse({
				command : "GetVersion",
			});

			if (message.code == 0) {
				// gamepadInfo
				console.log("[ppGamepad.js] getVersion success,message.code(version):  " + message.data);
				return message.data;
			} else {
				return null;
			}
		},

		_getConnectedDeviceInfo : function(order) {
			ppGamepad = getPlugin();
			var message = ppGamepad.postMessageAndAwaitResponse({
				command : "GetConnectedDeviceInfo",
				GetConnectedDeviceInfoUID : order
			});

			if (message.code == 0) {
				// gamepadInfo
				return message.data;
			} else {
				return null;
			}
		},

		getGamepads : function(gamepadObtainedCallback, errorCallback) {
			// check param is func
			if (!window.webapis._checkTypeValid("function", gamepadObtainedCallback)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError",
						"Invalid function type passed for 'gamepadObtainedCallback' parameter");
			}
			if (errorCallback && !window.webapis._checkTypeValid("function", errorCallback)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid errorCallback type passed for 'errorCallback' parameter");
			}

			var timeout = 1;
			setTimeout(function() {
				webapis.gamepad.getConnectedDevices(webapis.gamepad.GamepadArray, webapis.gamepad.GamepadValidArray, gamepadObtainedCallback, webapis.gamepad.GamepadDevice);
			}, timeout);
		},

		getConnectedDevices : function(arrayDevice, arrayValid, successCallback, classDevice) {
			for (var iCount = 0; iCount < arrayDevice.length; iCount++) {
				arrayValid[iCount] = false;
			}

			var iNum = 0;
			while (1) {
				var saDevInfo = null;
				saDevInfo = this._getConnectedDeviceInfo(iNum++);
				if (saDevInfo == null) {
					break;
				}
				if (this.isAvailable(saDevInfo.UID, arrayDevice, arrayValid) == null) {
					var iDeviceID = this._createDevice(saDevInfo.UID);
					if (iDeviceID != this.OCI_ERR) {
						var newDevice = new classDevice(saDevInfo, iDeviceID);
						newDevice.gamepadId = iDeviceID;
						newDevice.uid = saDevInfo.UID;
						newDevice.name = saDevInfo.name;
						newDevice.deviceType = saDevInfo.deviceType;
						arrayDevice.push(newDevice);
					}
				}
			}

			this.removeDevices(arrayDevice, arrayValid);
			successCallback(arrayDevice);
		},

		isAvailable : function(uniqueID, arrayDevice, arrayValid) {
			for (var nCount = 0; nCount < arrayDevice.length; nCount++) {
				if (arrayDevice[nCount].getUniqueId() == uniqueID) {
					arrayValid[nCount] = true;
					return nCount;
				}
			}
			return null;
		},

		removeSpecificDevice : function(uniqueID, arrayDevice, arrayValid) {
			var arrayID = this.isAvailable(uniqueID, arrayDevice, arrayValid);
			if (arrayID != null) {
				var deviceID = arrayDevice[arrayID].getGamepadId();
				delete arrayDevice[arrayID];
				this._destroyDevice(deviceID);
				arrayDevice.splice(arrayID, 1);
				arrayValid.splice(arrayID, 1);
			}
		},

		removeDevices : function(arrayDevice, arrayValid) {
			if (arrayValid.length) {
				for (var iCount = arrayValid.length - 1; iCount >= 0; iCount--) {
					if (arrayValid[iCount] == false) {
						this._destroyDevice(arrayDevice[iCount].getDeviceId());
						arrayDevice.splice(iCount, 1);
						arrayValid.splice(iCount, 1);
					}
				}
			}
		},

		isConnected : function(uid) {
			if (fileName && !window.webapis._checkTypeValid("DOMString", uid)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid DOMString type passed for 'uid' parameter");
			}
			
			ppGamepad = getPlugin();
			var message = ppGamepad.postMessageAndAwaitResponse({
				command : "IsConnected",
				uid : uid
			});
			
			if (message.code == 0) {
				// success
				return message.data;
			} else {
				// error
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},

		addGamepadConnectListener : function(listener) {
			// check param is func
			if (!window.webapis._checkTypeValid("function", listener)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid function type passed for 'listener' parameter");
			}

			var listenerId = this.callbackCount++;
			this._addConnectCallback(listenerId, listener);
			return listenerId;
		},

		removeGamepadConnectListener : function(listenerId) {
			// check param is func
			if (!window.webapis._checkTypeValid("long", listenerId)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'listenerId' parameter");
			}

			var callback = this._removeConnectCallbackById(listenerId);
			if (null == callback) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.NOT_FOUND_ERR, "NotFoundError", "Can not find Listener by this listenerId [" + listenerId + "]");
				return;
			}
		},

	};
})(this);

(function(window) {
	var MOD_NAME = "ContentsInfo";
	var INSTANTIATED_NAMESPACE = "contentsinfo";
	var PEPPER_PLUGIN_NAME = "contentsinfo";
	
	if (!window.webapis) {
		throw "Module " + MOD_NAME + ": window.webapis is not defined";
	}
	
	if(undefined !== window.webapis && undefined !== webapis.cis) {
  console.log("namespace webapis.contentsinfo is available.");
	}

  var CONTENTS_INFO_EVENT = "CONTENTS_INFO_EVENT";
    
	var ppContentsInfo = null;
	
	window.webapis[INSTANTIATED_NAMESPACE] = {
	    
	    EVENT_CHANNEL_CHANGED : 1,
	    EVENT_PROGRAM_CHANGED : 2,
	
	    //DOMString getVersion();
		getVersion : function() {
			ppContentsInfo = ppContentsInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppContentsInfo.postMessageAndAwaitResponse({
				command : "getVersion"
			});

			if (message.code == 0) {
				// success
				console.log("[contentsinfo.js] getVersion message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[contentsinfo.js] getVersion error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
	
		//DOMString getCurrentChannelName();
		getCurrentChannelName : function() {
			ppContentsInfo = ppContentsInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppContentsInfo.postMessageAndAwaitResponse({
				command : "getCurrentChannelName"
			});

			if (message.code == 0) {
				// success
				console.log("[contentsinfo.js] getCurrentChannelName message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[contentsinfo.js] getCurrentChannelName error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},

		//DOMString getCurrentChannelId();
		getCurrentChannelId : function() {
			ppContentsInfo = ppContentsInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppContentsInfo.postMessageAndAwaitResponse({
				command : "getCurrentChannelId"
			});

			if (message.code == 0) {
				// success
				console.log("[contentsinfo.js] getCurrentChannelId message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[contentsinfo.js] getCurrentChannelId error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},

		//DOMString getCurrentProgramName();
		getCurrentProgramName : function() {
			ppContentsInfo = ppContentsInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppContentsInfo.postMessageAndAwaitResponse({
				command : "getCurrentProgramName"
			});

			if (message.code == 0) {
				// success
				console.log("[contentsinfo.js] getCurrentProgramName message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[contentsinfo.js] getCurrentProgramName error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},

		//DOMString getCurrentProgramId();
		getCurrentProgramId : function() {
			ppContentsInfo = ppContentsInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppContentsInfo.postMessageAndAwaitResponse({
				command : "getCurrentProgramId"
			});

			if (message.code == 0) {
				// success
				console.log("[contentsinfo.js] getCurrentProgramId message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[contentsinfo.js] getCurrentProgramId error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},

    //unsigned long addListener(CisEventCallback listener);
		addEventListener : function(listener) {
			if (!window.webapis._checkTypeValid("function", listener)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid function type passed for 'listener' parameter");
			}
			ppContentsInfo = ppContentsInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppContentsInfo.postMessageAndAwaitResponse({
				command : "addEventListener"
			});

			if (message.code == 0) {
			    
			    //success, add listener
				var listenerId = ppContentsInfo.addListener(CONTENTS_INFO_EVENT, function(msg) {
					listener(msg.data.code, msg.data.data);
				});
				
				return listenerId;
			} else {
				// error
				console.log("[contentsinfo.js] addEventListener error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		
    removeEventListener : function(listenerId) {
			if (!window.webapis._checkTypeValid("long", listenerId)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'listenerId' parameter");
			}

			ppContentsInfo = ppContentsInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			
			var listener = ppContentsInfo.getListenerById(CONTENTS_INFO_EVENT, listenerId);
			
			if (!listener || listener.length == 0){
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.NOT_FOUND_ERR, "NotFoundError", "Can not find Listener by this listenerId [" + listenerId + "]");
			}
			
			var message = ppContentsInfo.postMessageAndAwaitResponse({
				command : "removeEventListener"
			});

			if (message.code == 0) {
				// success
				console.log("[contentsinfo.js] removeEventListener success");
				var flag = ppContentsInfo.removeListenerById(CONTENTS_INFO_EVENT, listenerId);
			} else {
				// error
				console.log("[contentsinfo.js] addEventListener error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		}		
	};
})(this);
(function(window) {
	var MOD_NAME = "AvInfo";
	var INSTANTIATED_NAMESPACE = "avinfo";
	var PEPPER_PLUGIN_NAME = "avinfo";
	if (!window.webapis) {
		throw "Module " + MOD_NAME + ": window.webapis is not defined";
	}

	var ppAvInfo = null;
	window.webapis[INSTANTIATED_NAMESPACE] = {

		SCREEN_MODE_WIDESCREEN : 0,
		SCREEN_MODE_SUPERWIDESCREEN : 1,
		SCREEN_MODE_PANORAMA : 2,

		DOLBY_DIGITAL_COMP_MODE_LINE : 0,
		DOLBY_DIGITAL_COMP_MODE_RF : 1,

		// DOMString getVersion();
		getVersion : function() {
			ppAvInfo = ppAvInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			var message = ppAvInfo.postMessageAndAwaitResponse({
				command : "getVersion"
			});
			if (message.code == 0) {
				// success
				console.log("[AvInfo.js] getVersion message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[AvInfo.js] getVersion error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}

		},
		
		isHdrTvSupport : function() {
			console.log("isHdrTvSupport in........ ");
			ppAvInfo = ppAvInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			
			var message = ppAvInfo.postMessageAndAwaitResponse({
				command : "isHdrTvSupport"
			});

			if (message.code == 0) {
				// success
				console.log("[AvInfo.js] isHdrTvSupport message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[AvInfo.js] isHdrTvSupport error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},
		// boolean setWideScreenMode(unsigned long desktopId, unsigned short screenMode);
		setWideScreenMode : function(desktopId, screenMode) {
			if (!window.webapis._checkTypeValid("short", desktopId)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid long type passed for 'desktopId' parameter");
			}
			
			if (!window.webapis._checkTypeValid("short", screenMode)) {
				throw window.webapis._createWebAPIException(window.webapis.WebAPIException.TYPE_MISMATCH_ERR, "TypeMismatchError", "Invalid short type passed for 'screenMode' parameter");
			}

			ppAvInfo = ppAvInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);

			var message = ppAvInfo.postMessageAndAwaitResponse({
				command : "setWideScreenMode",
				desktopId : desktopId,
				screenMode : screenMode
			});

			if (message.code == 0) {
				// success
				return message.data;
			} else {
				// error
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		},

		// unsigned short getDolbyDigitalCompMode();
		getDolbyDigitalCompMode : function() {
			ppAvInfo = ppAvInfo || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			
			var message = ppAvInfo.postMessageAndAwaitResponse({
				command : "getDolbyDigitalCompMode"
			});

			if (message.code == 0) {
				// success
				console.log("[AvInfo.js] getDolbyDigitalCompMode message data " + message.data);
				return message.data;
			} else {
				// error
				console.log("[AvInfo.js] getDolbyDigitalCompMode error " + message.code);
				throw window.webapis._createWebAPIError(message.code, message.errorName, message.errorMessage);
			}
		}

	};
})(this);

(function(window) {
	var MOD_NAME = "billing";
	var INSTANTIATED_NAMESPACE = "billing";
	var PEPPER_PLUGIN_NAME = "billing";
	if (!window.webapis)
		throw "Module " + MOD_NAME + ": window.webapis is not defined";

	var ppBilling = null;
	window.webapis[INSTANTIATED_NAMESPACE] = {
		getVersion : function(onsuccess, onerror) {
			console.log("[BILLING_PP] Billing getVersion");
			if (!window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid VersionSuccessCallback type passed for 'onsuccess' parameter");
			}
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}

			ppBilling = ppBilling || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			ppBilling.postMessage({
				command : "billing_plugin_getVersion"
			}, function(message) {
				console.log("[BILLING_PP] message");
				var msgData = message.data;
				if (msgData.status == 0) {
					// success
					console.log("[BILLING_PP] message success");
					onsuccess.call(null, msgData.data);
				} else {
					// error
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.status, msgData.errorName, msgData.errorMessage));
				}
			});
		},
		buyItem : function (appid,server_type,paymentDetail, onsuccess, onerror) {
			console.log("[BILLING_PP] call");
			if (!window.webapis._checkTypeValid("DOMString", appid)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'appid' parameter");
			}
			console.log("[BILLING_PP] param appid is valid");
			if (!window.webapis._checkTypeValid("DOMString", server_type)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'server_type' parameter");
			}
			console.log("[BILLING_PP] param server_type is valid");
			if (!window.webapis._checkTypeValid("DOMString", paymentDetail)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid DOMString type passed for 'paymentDetail' parameter");
			}
			console.log("[BILLING_PP] param paymentDetail is valid");
			
			if (!window.webapis._checkTypeValid("function", onsuccess)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid VersionSuccessCallback type passed for 'onsuccess' parameter");
			}
			
			console.log("[BILLING_PP] function onsuccess is valid");
			if (onerror && !window.webapis._checkTypeValid("function", onerror)) {
				throw window.webapis._createWebAPIException(0, "TypeMismatchError", "Invalid ErrorCallback type passed for 'onerror' parameter");
			}
			console.log("[BILLING_PP] function onerror is valid");
			
			
		
			
			ppBilling = ppBilling || webapis._getPepperPlugin(PEPPER_PLUGIN_NAME);
			//ppBilling=new PepperPlugin();
			console.log("[BILLING_PP] get PepperPlugin[ppBilling] object success" );
			ppBilling.postMessage({
				command :'billing_plugin_request_payment',
				appid :appid,
			    server_type : server_type,
				payInfo :paymentDetail
			}, function(message) {
				console.log("[BILLING_PP] message");
				var msgData = message.data;
				if (msgData.status == 0) {
					// success
					var data;
					if ("" != msgData) {
						
						data = {
								payResult :   ((typeof(msgData.pay_result)== 'undefined')?'':msgData.pay_result),
								payDetail :   ((typeof(msgData.pay_detail)== 'undefined')?'':msgData.pay_detail)
						};
					} else {
						data = {
								payResult: '',
							    payDetail: ''
						};
					}
					onsuccess.call(null, data);
				} else {
					//error
					onerror && onerror.call(null, webapis._createWebAPIError(msgData.status, msgData.errorName, msgData.errorMessage));
				}
			});
		},
		
	};
})(this);

if(!window.webapis) { window.webapis = {}; } //Make sure webapis exists
window.webapis.adframework = {}; //Make sure webapis.adframework exists and is empty when we begin load

//The Config is where all configuration parameters of the Ad Framework are stored and set.

if(typeof window.webapis.adframework !== "object") {
	window.webapis.adframework = {}; 
}

/**
 * @brief Config Model.
 * @details A BluePrint of Config Model
 * @return Null
 */
webapis.adframework.config = (function() {
	"use strict";
	var Obj = function() {
		this.configuration = {};
		this.setDefaults();
	};
	
	//Enum for behavior if FF is used to go past several midrolls. Should we play first, last, all, or none?
	Obj.prototype.FF_MIDROLL_BEHAVIOR = {
		PLAY_ONE: "PLAY_ONE",
		PLAY_ALL: "PLAY_ALL",
		PLAY_NONE: "PLAY_NONE"
	};
	
	//Enum for the position of the Visual Overlay - the SkipUI and NonLinearUI.
	Obj.prototype.OVERLAY_POSITION = {
		TOP_LEFT: "TOP_LEFT",
		TOP_RIGHT: "TOP_RIGHT",
		BOTTOM_LEFT: "BOTTOM_LEFT",
		BOTTOM_RIGHT: "BOTTOM_RIGHT",
		DISABLED: "DISABLED"
	};
	
	//This configuration is loaded upon initialization of the Config.
	Obj.prototype._standardConfiguration = {
			
		/*
			MAX_VAST_WRAPPER_DEPTH (Depth|Integer)
			Maximum wrapper depth that the parser will try before giving up as a "no ad".
		*/
		MAX_VAST_WRAPPER_DEPTH: 5,
		
		/*
			AD_RETRIEVAL_TIMEOUT (Milliseconds|Integer)
			The maximum time the XML parser will wait for wrappers to resolve themselves, before giving up as a "no ad".
		*/
		AD_RETRIEVAL_TIMEOUT: 5000,

		/*
			AJAX_TIMEOUT (Milliseconds|Integer)
			The maximum time to wait for any one AJAX call.
		*/
		AJAX_TIMEOUT: 10000,
		
		/*
			PLAY_ALL_ADS (Boolean)
			TRUE: All ads in the adbreak will play, no matter what. Overrides MAXIMUM_ADBREAK_DURATION.
			FALSE (w/ ad pod): Plays the ad pod in the break (if duration permits), and then ends the ad break
			FALSE (no ad pod): Tries to keep the duration of the adbreak around or less than the target adbreak duration.
		*/
		PLAY_ALL_ADS : false,
		
		/*
			TARGET_ADBREAK_DURATION (Milliseconds|Integer)
			Applies only to ad buffets (ad pods override this option). 
			The player will play ads from the buffet until this approximate duration has been reached.
			It allows some squish time, adbreaks may go over, or go under this number.
		*/
		TARGET_ADBREAK_DURATION : 120 * 1000,
		
		/*
			MAXIMUM_ADBREAK_DURATION (Milliseconds|Integer)
			The player will play ads from the adbreak, stopping before this maximum duration has been reached.
			This option will apply even to ad pods, cutting leaving off ads from the pod if necessary.
			Please note that this option calculates the duration by the time reported in the VAST, so it may not accurately reflect buffering time or encoding variance.
		 */
		MAXIMUM_ADBREAK_DURATION : 240 * 1000,
		
		/*
			AGGRESSIVE_DURATION_ENFORCEMENT (Milliseconds|Integer)
			This option influences MAXIMUM_ADBREAK_DURATION. 
			Instead of relying on the reported ad durations in the VAST, it uses an internal timer.
			This internal timer will cut off the adbreak (even if an ad is in progress) after MAXIMUM_ADBREAK_DURATION has been reached.
			Useful if you are playing a live stream and absolutely need to resume at the right time, or are dealing with inaccurate duration reports in VAST.
		 */
		AGGRESSIVE_DURATION_ENFORCEMENT : false,
		
		/*
			AGGRESSIVE_DURATION_ENFORCEMENT_CUSHION (Milliseconds|Integer)
			The maximum amount of time an adbreak is allowed to go over the MAXIMUM_ADBREAK_DURATION allotment before it is cut off prematurely.
		 */
		AGGRESSIVE_DURATION_ENFORCEMENT_CUSHION : 1000,
		
		/*
			FF_MIDROLL_BEHAVIOR (webapis.adframework.config.FF_MIDROLL_BEHAVIOR)
			Defines the behavior if the user fast forwards past the trigger points of multiple midrolls.
				PLAY_ONE	: Plays one of the midrolls that was scheduled. Skips all others. No guarantee is possible on which midroll is played.
				PLAY_ALL	: Plays all midrolls. Not really recommended because it could impact user experience.
				PLAY_NONE	: Plays none of the midrolls. Not really recommended because the user could simply FF past the midroll to skip it.
		 */
		FF_MIDROLL_BEHAVIOR: Obj.prototype.FF_MIDROLL_BEHAVIOR.PLAY_ONE,
		
		/*
			REWIND_BEFORE_RESUME (Seconds|Integer)
			When ending an adbreak and resuming the content, rewind this many seconds
		 */
		REWIND_BEFORE_RESUME: 0,
		
		/*
			CONTENT_PREBUFFER_ADVANCE_TIME (Milliseconds|Integer)
			When playing the last linear ad in an adbreak, start buffering the content X milliseconds before the linear ad ends
		 */
		CONTENT_PREBUFFER_ADVANCE_TIME: 10000,
		
		/*
			AD_PREBUFFER_ADVANCE_TIME (Milliseconds|Integer)
			When playing the content, start buffering the next ad X milliseconds before the linear ad starts
		 */
		AD_PREBUFFER_ADVANCE_TIME: 10000,
		
		/*
			OVERLAY_POSITION (webapis.adframework.config.OVERLAY_POSITION)
			Specifies the position of the visual overlay (NonLinear ads and skip buttons for skippable linear ads)
				TOP_LEFT: Displays the visual overlay on the top left of the video frame.
				TOP_RIGHT: Displays the visual overlay on the top right of the video frame.
				BOTTOM_LEFT: Displays the visual overlay on the bottom left of the video frame.
				BOTTOM_RIGHT: Displays the visual overlay on the bottom right of the video frame.
				DISABLED: No visual overlay will display on screen.
		 */
		OVERLAY_POSITION: Obj.prototype.OVERLAY_POSITION.BOTTOM_RIGHT,
		
		/*
			NONLINEAR_DEFAULT_DISPLAY_TIME (Milliseconds|Integer)
			Target time to display a NonLinear ad if there is no minSuggestedDuration
		 */
		NONLINEAR_DEFAULT_DISPLAY_TIME: 15000,
		
		/*
			NONLINEAR_MAXIMUM_DISPLAY_TIME (Milliseconds|Integer)
			Maximum time to display a NonLinear ad regardless of its minSuggestedDuration
		 */
		NONLINEAR_MAXIMUM_DISPLAY_TIME: 60000,
		
		/*
			NONLINEAR_MAXIMUM_VIDEO_COVERAGE_RATIO (Ratio|Integer)
			Maximum height of screen to cover with NonLinear ad before the framework scales the ad down.
			Ads will be rejected if they do not have a resource that can display lower than this ratio.
			Scaling only applies if the NonLinear ad specifies that it is scalable.
		 */
		NONLINEAR_MAXIMUM_VIDEO_COVERAGE_RATIO: 0.15,
		
		/*
			NONLINEAR_TARGET_VIDEO_COVERAGE_RATIO (Ratio|Integer)
			Target height of screen to cover with NonLinear ad.
			Applies during the selection of a NonLinear resource (does not affect scaling)
		 */
		NONLINEAR_TARGET_VIDEO_COVERAGE_RATIO: 0.10,
		
		/*
			NONLINEAR_MINIMUM_VIDEO_COVERAGE_RATIO (Ratio|Integer)
			Minimum height of screen to cover with NonLinear ad before the framework scales the ad up.
			Only applies if the NonLinear ad specifies that it is scalable.
		 */
		NONLINEAR_MINIMUM_VIDEO_COVERAGE_RATIO: 0.05,
		
		/*
			NONLINEAR_RESOURCE_TIMEOUT (Milliseconds|Integer)
			Length of time that the ad framework will wait for NonLinear Ad resources to load before timing them out.
		 */
		NONLINEAR_RESOURCE_TIMEOUT: 5000,
		
		/*
			LINEAR_RESOURCE_TIMEOUT (Milliseconds|Integer)
			Length of time that the ad framework will wait for Linear Ad resources to start playback before timing them out.
			If a LINEAR_RESOURCE_TIMEOUT has occurred within the last 60 seconds, this value will automatically be reduced to LINEAR_RESOURCE_REPEAT_TIMEOUT.
			Set to 0 to disable.
		 */
		LINEAR_RESOURCE_TIMEOUT: 25000,
		
		/*
			LINEAR_RESOURCE_REPEAT_TIMEOUT (Milliseconds|Integer)
			Only used if a LINEAR_RESOURCE_TIMEOUT has occurred within the last 60 seconds.
			Length of time that the ad framework will wait for Linear Ad resources to start playback before timing them out.
		 */
		LINEAR_RESOURCE_REPEAT_TIMEOUT: 7000,
		
		/*
			COMPANION_AD_ENABLE (Boolean)
			The ad framework will stop handling all COMPANION Ad if set to false.
		 */
		COMPANION_AD_ENABLE: true,

		/*
			VPAID_ENABLE (Boolean)
			The ad framework will stop handling all VPAID Ad if set to false.
		 */
		VPAID_ENABLE: true,

		/*
			VPAID_DEFAULT_LOAD_TIMEOUT (Milliseconds|Integer)
			Length of time that the ad framework will wait for a VPAID ad to start before timing them out.
		 */
		VPAID_DEFAULT_LOAD_TIMEOUT: 9000,

		/*
			VPAID_DEFAULT_START_TIMEOUT (Milliseconds|Integer)
			Length of time that the ad framework will wait for a VPAID ad unit to send back AdStarted event after calling startAd() before timing them ou
		 */
		VPAID_DEFAULT_START_TIMEOUT: 9000,

		/*
			VPAID_DEFAULT_STOP_TIMEOUT (Milliseconds|Integer)
			Length of time that the ad framework will wait for a VPAID ad unit to send back AdStopped event after calling stopAd() before timing them out.
		 */
		VPAID_DEFAULT_STOP_TIMEOUT: 9000,

		/*
			VPAID_DEFAULT_ADLINEARCHANGE_TIMEOUT (Milliseconds|Integer)
			Receiving AdLinearChange event with adLinear set to true but never receiving AdLinearChange event with adLinear set to false (excluding ad pause/resume time) will need to trigger an error.
			Length of time cushion to allow a NonLinear click-to-linear ad to play before killing it.
			The ad framework will allow for the reported duration of the linear ad, plus the time cushion.

		 */
		VPAID_DEFAULT_ADLINEAR_TIMEOUT: 9000,

		/*
			PLAYBACK_FAILURE_RETRY_COUNT (Count|Integer)
			Number of times the ad framework will attempt to recover from a playback failure before giving up.
			The failure count resets after 60 seconds of no further reported errors.
		 */
		PLAYBACK_FAILURE_RETRY_COUNT: 2,
		
		/*
			ENABLE_LINEAR_CLICK (Boolean)
			If true, the ad framework will create an invisible overlay on top of linear ads that allows the user to click the element.
			Upon clicking the video, the proper tracking events will be fired, and an iFrame opened to the ad's clickthrough website.
		 */
		ENABLE_LINEAR_CLICK: true,
		
		/*
			START_BITRATE (Bits Per Second|Integer) OR "AUTO"
			The ad framework will attempt to start all streaming ads at the specified bitrate.
			Upon clicking the video, the proper tracking events will be fired, and an iFrame opened to the ad's clickthrough website.
			Set to 0 to disable.
		 */
		START_BITRATE: "AUTO",
		
		/*
			START_BITRATE_AUTO_RATIO (Ratio|Fraction of One)
			If START_BITRATE is set to "AUTO", then the framework will begin buffering the next ad at the bitrate of the currently streaming video, multiplied by this ratio.
		 */
		START_BITRATE_AUTO_RATIO: 0.9,
		
		/*
			DISABLE_AD_INSERTION (Boolean)
			The ad framework will stop all adbreak triggering for the time being.
			All adbreaks that would have been triggered while this setting is true will be skipped.
			Useful during EAS messages.
		 */
		DISABLE_AD_INSERTION: false,
		
		/*
			MIDROLL_TRIM_LIMIT (Integer)
			The ad framework will start removing already-played midrolls from the midroll list if the midrolls length is over this limit.
		 */
		MIDROLL_TRIM_LIMIT: 20,

		/*
			ADAPTIVE_CONTENT (Boolean)
			If set to true, the framework will assume the given content is of an adaptive streaming enabled protocol (HLS, DASH, Smooth).
			The framework will prebuffer content based on the adaptive streaming algorithm (instead of starting at the lowest possible bitrate each time).
			WARNING: If this option is enabled for progressive content (i.e. MP4 files), it may cause playback errors.
		 */
		ADAPTIVE_CONTENT: false,

		//Debug stuff, you don't need this
		DISABLE_TRACKING_EVENTS: false,
		DEBUG_CONSOLE_LOGS: true,
		DEBUG_ALERTS: false,
		ENABLE_TIZEN: true		//added by jasmine.d for TIZEN support 
	};
	
	
	/**
	* @fn		set
	* @brief	
	*
	* @param[in]/[out]	: key
	*					: value
	* @return			: Obj.prototype.set =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.set = function(key, value) {
		
		if(typeof key === "string" && typeof value !== "undefined") {
			this.configuration[key] = value;
		}
		else {
			for(var type in key) {
				if(key.hasOwnProperty(type)) {
					this.configuration[type] = key[type];
				}
			}
		}
	};
	
	//Gets a configuration value based on its String key.
	/**
	* @fn		get
	* @brief	
	*
	* @param[in]/[out]	: key
	* @return			: Obj.prototype.get =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.get = function(key) {
		return this.configuration[key];
	};
	
	//Returns all config values to defaults
	/**
	* @fn		setDefaults
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.setDefaults =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setDefaults = function() {
		this.set(this._standardConfiguration);
	};
	
	return new Obj();
})();

if(typeof Object.freeze === "function") { 
	Object.freeze(webapis.adframework.config);
}

(function() {
	"use strict";
	if(typeof window.webapis.adframework !== "object") { 
		window.webapis.adframework = {}; 
	}
	
	//Generic event dispatcher that allows addListener(eventName, function), dispatch(eventName, params), and removeListener(eventName, function).
	//If the registered function returns 'unsubscribe' as a String, it will be removed from the list of listeners.
	
	/**
 * @brief GenericEventDispatcher Model.
 * @details A BluePrint of GenericEventDispatcher Model
 * @return Null
 */
	webapis.adframework.GenericEventDispatcher = (function() {
		var Obj = function() {
			this._eventMap = {};
		};
		
		//Listens for the 'key' (event) using the specified function. If invokeOnce is true, the function will be removed upon first execution.
		/**
		* @fn		addListener
		* @brief	
		*
		* @param[in]/[out]	: eventType
		*					: func
		*					: invokeOnce
		* @return			: Obj.prototype.addListener =
		* @warning			: None
		* @exception		: None
		* @see
		*/
		Obj.prototype.addListener = function(eventType, func, invokeOnce) {
            if(typeof func !== "function" || !eventType) { 
				throw "missing function or eventType: " + eventType + " | " + func; 
			}
			
			if (!this._eventMap.hasOwnProperty(eventType)) {
				this._eventMap[eventType] = [];
			}
			
			invokeOnce = (invokeOnce === true) ? true : false;
			var handler = {
				func: func,
				invokeOnce: invokeOnce
			};
			this._eventMap[eventType].push(handler);
		};
		
		//Removes a function from the listeners map. If no event name is given, the function is removed from all listener maps.
		/**
		* @fn		removeListener
		* @brief	
		*
		* @param[in]/[out]	: eventType
		*					: funcToRemove
		* @return			: Obj.prototype.removeListener =
		* @warning			: None
		* @exception		: None
		* @see
		*/
		Obj.prototype.removeListener = function(eventType, funcToRemove){
			try {
				
				var currentFunc = null;
				
				if(typeof eventType === "undefined") { 
					throw "EventDispatcher.removeListener() called with empty argument list";
				}
				if(typeof funcToRemove !== "function" && typeof eventType === "function") {
	                funcToRemove = eventType;
					for (var eventList in this._eventMap) {
						if (this._eventMap.hasOwnProperty(eventList)) {
							for(var i = 0; i < this._eventMap[eventList].length; i++) {
								currentFunc = this._eventMap[eventList][i].func;
	                            if(funcToRemove === currentFunc) {
									this._eventMap[eventList].splice(i, 1);
									break;
								}
	                            else { 
									; /*NULL*/
								}
							}
						}
					}
				}
				else {
					//removeListener function from one list ("eventType")
					for(var x = 0; x < this._eventMap[eventType].length; x++) {
						currentFunc = this._eventMap[eventType][x].func;
						if(funcToRemove === currentFunc) {
							this._eventMap[eventType].splice(x, 1);
							break;
						}
					}
				}
			}
			catch(e) {
				throw "EventDispatcher.removeListener() exception: " + e;
			}
		};
		
		//Dispatches an event with an optional param map to all listening functions.
		/**
		* @fn		dispatch
		* @brief	
		*
		* @param[in]/[out]	: event
		*					: params
		* @return			: Obj.prototype.dispatch =
		* @warning			: None
		* @exception		: None
		* @see
		*/
		Obj.prototype.dispatch = function(event, params){
			if(typeof event === "undefined" || !event) { 
				throw "Attempted to throw invalid event: " + event; 
			}
			
			params = params || {};
			if(this._eventMap.hasOwnProperty(event)) {
				var executeList = [];
				var removeList = [];
				var errorList = [];
				var x;
				var currentFunc = null;
				for(var i = 0; i < this._eventMap[event].length; i++) {
					currentFunc = this._eventMap[event][i].func;
					if(this._eventMap[event][i].invokeOnce) {
						removeList.push(currentFunc);
					}
					executeList.push(currentFunc);
				}
				for (x = 0; x < executeList.length; x++) {
					currentFunc = executeList[x];
							currentFunc.call(this, event, params);
						}
				for (x = 0; x < removeList.length; x++) {
					this.removeListener(event, removeList[x]);
					}
				for (x = 0; x < errorList.length; x++) {
					try {
						this.removeListener(event, errorList[x]);
				}
					catch(e) {
						;/*NULL*/
					}
				}
			}
		};
		
		//Deletes all listeners.
		/**
		* @fn		reset
		* @brief	
		*
		* @param[in]/[out]	: void
		* @return			: Obj.prototype.reset =
		* @warning			: None
		* @exception		: None
		* @see
		*/
		Obj.prototype.reset = function() {
			try {
			for(var key in this._eventMap) {
				if(this._eventMap.hasOwnProperty(key)) {
					delete this._eventMap[key];
				}
			}
			}
			catch(e) {
				; /*NULL*/
			}
			this._eventMap = {};
		};
		return Obj;
	}());

	//An implementation of GenericEventDispatcher that includes a map of event types.
	if(typeof window.webapis.adframework !== "object") {
		window.webapis.adframework = {}; 
	}
	
	webapis.adframework.events = new webapis.adframework.GenericEventDispatcher();
	(function(){
		var events = {
			//Stuff I really need
			PLAYBACK_TIME: "PLAYBACK_TIME", 
			AD_PLAYBACK_TIME: "AD_PLAYBACK_TIME", 
			CONTENT_PLAYBACK_TIME: "CONTENT_PLAYBACK_TIME", 
			
			ADBREAK_INSERTION_SUCCESS: "ADBREAK_INSERTION_SUCCESS", 
			ADBREAK_INSERTION_FAILURE: "ADBREAK_INSERTION_FAILURE", 

			PLAYBACK_COMPLETE: "PLAYBACK_COMPLETE",
			
			LINEAR_AD_START: "LINEAR_AD_START", 
			LINEAR_AD_END: "LINEAR_AD_END",
			NONLINEAR_AD_START: "NONLINEAR_AD_START",
			NONLINEAR_AD_END:  "NONLINEAR_AD_END",
			ADBREAK_START: "ADBREAK_START",
			ADBREAK_END: "ADBREAK_END",
			CONTENT_START: "CONTENT_START",
			CONTENT_PAUSE: "CONTENT_PAUSE",
			TRACKING_EVENT: "TRACKING_EVENT", 
			
			IFRAME_OPEN: "IFRAME_OPEN", 
			IFRAME_CLOSE: "IFRAME_CLOSE",
			
			COMPANION_ADS_CREATIVE_DETECTED: "COMPANION_ADS_CREATIVE_DETECTED",
			COMPANION_AD_FAILED_REQUIRED_ALL: "COMPANION_AD_FAILED_REQUIRED_ALL",
			COMPANION_AD_FAILED_REQUIRED_ANY: "COMPANION_AD_FAILED_REQUIRED_ANY",
			COMPANION_AD_START: "COMPANION_AD_START",
			
			NONLINEAR_DETECTED: "NONLINEAR_DETECTED",
			CLOSE_NONLINEAR: "CLOSE_NONLINEAR",

			UNRECOVERABLE_PLAYBACK_ERROR: "UNRECOVERABLE_PLAYBACK_ERROR", 
			RECOVERABLE_PLAYBACK_ERROR: "RECOVERABLE_PLAYBACK_ERROR", 
			VSUITE_PLAYBACK_ERROR: "VSUITE_PLAYBACK_ERROR", 
			PARSING_ERROR: "PARSING_ERROR", 
			ERROR_TRACKER: "ERROR_TRACKER", 
			ON_BROWSER_LOAD: "ON_BROWSER_LOAD",
			ON_BROWSER_UNLOAD: "ON_BROWSER_UNLOAD",
			STOPPEDALL: "STOPPEDALL",
            INITIALIZE_VPAID: "INITIALIZE_VPAID",
			START_VPAID: "START_VPAID",		
			VPAID_EVENT: "VPAID_EVENT",
			VPAID_COMPLETE: "VPAID_COMPLETE",
			VPAID_LINEARITY_CHANGE: "VPAID_LINEARITY_CHANGE", 

			//Debug stuff
			STREAM_TYPE: "STREAM_TYPE", 
			PLAYBACK_TYPE: "PLAYBACK_TYPE",
			DEBUG_MESSAGE: "DEBUG_MESSAGE", 
			PREBUFFER_EVENT: "PREBUFFER_EVENT", 

			VPAID_ERROR: "VPAID_ERROR", 
			VPAID_LINEAR_PLAYBACK_TIME: "VPAID_LINEAR_PLAYBACK_TIME"
			
		};
		for(var key in events) {
			if(events.hasOwnProperty(key)) {
				webapis.adframework.events[key] = events[key];
			}
		}
	}());
	
	if(typeof Object.freeze === "function") {
		Object.freeze(webapis.adframework.events);
	}
	
}());

if(typeof window.webapis.adframework !== "object") {
	window.webapis.adframework = {}; 
}

/**
 * @brief MacroHelper Model.
 * @details A BluePrint of MacroHelper Model
 * @return Null
 */
webapis.adframework.MacroHelper = (function() {
	"use strict";
	//"Macros" are templates used in the adframework tracking URIs. When encountered, the player must replace these macros with the appropriate information before submitting the request. 
	var Macros = {
	    ERRORCODE : new RegExp("(\\[|%5B)ERROR_?CODE(\\]|%5D)", "ig"), //Replaced with one of the error code Enum values.
	    //There's a discrepancy in the adframework spec of whether the ERRORCODE and ERRORMESSAGE have an underscore in it or not, so we account for both cases
	    ERRORMESSAGE: new RegExp("(\\[|%5B)ERROR_?MESSAGE(\\]|%5D)", "ig"), //Replaced with an error message at the video player's discretion
	    CONTENTPLAYHEAD : new RegExp("(\\[|%5B)CONTENTPLAYHEAD(\\]|%5D)", "ig"), //Replaced with the current time offset of the video content (not the ad). "HH:MM:SS.mmm"
	    CACHEBUSTING : new RegExp("(\\[|%5B)CACHEBUSTING(\\]|%5D)", "ig"), //Replaced with a random 8 digit number, this forces the browser to request the tracking URI even if already cached.
	    ASSETURI : new RegExp("(\\[|%5B)ASSETURI(\\]|%5D)", "ig") //Replaced with the URI of the Ad asset being played.
	};
	if(typeof Object.freeze === "function") { 
		Object.freeze(Macros);
	}
	
	//Replace all macros in an error URL with the errorcode, errormessage, and cachebuster
	/**
	* @fn		replaceErrorMacros
	* @brief	
	*
	* @param[in]/[out]	: uri
	*					: code
	*					: message
	*					: contentPlayhead
	*					: adAssetURI
	* @return			: var replaceErrorMacros =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var replaceErrorMacros = function(uri, code, message, contentPlayhead, adAssetURI) {
		
		if (contentPlayhead) {
			contentPlayhead = webapis.adframework.utils.getTimeString(contentPlayhead);
			uri = uri.replace(Macros.CONTENTPLAYHEAD, encodeURIComponent(contentPlayhead));
		}
		else {
			uri = uri.replace(Macros.CONTENTPLAYHEAD, "UNDEFINED");
		}

		if (adAssetURI) {
			uri = uri.replace(Macros.ASSETURI, encodeURIComponent(adAssetURI));
		}
		else {
			uri = uri.replace(Macros.ASSETURI, "UNDEFINED");
		}
		if(typeof code === "string" || typeof code === "number") {
			uri = uri.replace(Macros.ERRORCODE, encodeURIComponent(code));
		}
		else {
			uri = uri.replace(Macros.ERRORCODE, encodeURIComponent("UNDEFINED"));
		}
		if(typeof message === "string") {
			uri = uri.replace(Macros.ERRORMESSAGE, encodeURIComponent(message));
		}
		else {
			uri = uri.replace(Macros.ERRORMESSAGE, encodeURIComponent("UNDEFINED"));
		}
		uri = uri.replace(Macros.CACHEBUSTING, encodeURIComponent(webapis.adframework.utils.pad(Math.floor(Math.random() * (99999999 - 0 + 1) + 0), 8)));
		return uri;
	};
	
	//Replace all macros in a tracking URL with the contentPlayhead, adAssetURI, and cachebuster
	/**
	* @fn		replaceTrackingMacros
	* @brief	
	*
	* @param[in]/[out]	: uri
	*					: contentPlayhead
	*					: adAssetURI
	* @return			: var replaceTrackingMacros =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var replaceTrackingMacros = function(uri, contentPlayhead, adAssetURI) {
	    
	    if(contentPlayhead) {
	    	contentPlayhead = webapis.adframework.utils.getTimeString(contentPlayhead);
	    	uri = uri.replace(Macros.CONTENTPLAYHEAD, encodeURIComponent(contentPlayhead));
	    }
	    else {
	    	uri = uri.replace(Macros.CONTENTPLAYHEAD, "UNDEFINED");
	    }
	    
	    if(adAssetURI) {
	    	uri = uri.replace(Macros.ASSETURI, encodeURIComponent(adAssetURI));
	    }
	    else {
	    	uri = uri.replace(Macros.ASSETURI, "UNDEFINED");
	    }
	    
	    uri = uri.replace(Macros.CACHEBUSTING, encodeURIComponent(webapis.adframework.utils.pad(Math.floor(Math.random() * (99999999 - 0 + 1) + 0), 8)));
	    
	    return uri;
	};
	
	return {
		replaceTrackingMacros: replaceTrackingMacros,
		replaceErrorMacros: replaceErrorMacros
	};
})();

if(typeof Object.freeze === "function") { 
	Object.freeze(webapis.adframework.MacroHelper);
}

/*
 * webapis.adframework.Promise
 * Author: Amit Tyagi
 * An implementation of the Promise system for asynchronous behavior.
*/

if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {};
}

/**
 * @brief PromiseList Model.
 * @details A BluePrint of PromiseList Model
 * @return Null
 */
webapis.adframework.PromiseList = (function() {
	"use strict";
	var Obj = function() {
		this._promises = [];
		this._completeListeners = [];
		this._hasStarted = false;
	};
	
	//Starts checking if this list is done. Call this after adding all of the promises you want to this list!
	/**
	* @fn		start
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.start =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.start = function() {
		this._hasStarted = true;
		this.checkIfDone();
	};
	
	//Adds a promise to the list to check for.
	/**
	* @fn		add
	* @brief	
	*
	* @param[in]/[out]	: promise
	* @return			: Obj.prototype.add =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.add = function(promise) {
		var self = this;
		self._promises.push(promise);
		promise.onComplete(function(){ 
			self.checkIfDone.call(self); 
		});
		
		return this;
	};
	
	//Are all of the promises in this list done? Returns false if start() hasn't been called yet.
	/**
	* @fn		isDone
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isDone =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isDone = function() {
		if(!this._hasStarted) { 
			return false; 
		}
		
		var done = true;
		for(var i = 0; i < this._promises.length; i++) {
			var promise = this._promises[i];
			if(!promise.isDone()) {
				done = false;
				break;
			}
		}
		return done;
	};
	
	//Register a callback function for when all promises in this list are complete. If the list is already done, fires the callback right away.
	/**
	* @fn		onComplete
	* @brief	
	*
	* @param[in]/[out]	: callback
	* @return			: Obj.prototype.onComplete =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onComplete = function(callback) {
		if(this.isDone()) {
			callback();
		}
		else {
			this._completeListeners.push(callback);
		}
		return this;
	};
	
	//Checks if this list is done, and if so, fire all listeners.
	/**
	* @fn		checkIfDone
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.checkIfDone =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.checkIfDone = function() {
		if(!this._hasStarted) {
			return false;
		}
		
		if(this.isDone()) {
			if(!this._hasFired) {
				for(var i = 0; i < this._completeListeners.length; i++) {
					this._completeListeners[i]();
				}
			}
			this._hasFired = true;
			return true;
		}
		else {
			return false;
		}
	};
	
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj);
	}
	return Obj;

}());

if(typeof window.webapis.adframework !== "object") {
	window.webapis.adframework = {}; 
}

/**
 * @brief Promise Model.
 * @details A BluePrint of Promise Model
 * @return Null
 */
webapis.adframework.Promise = (function() {
	"use strict";
	var Obj = function() {
        this._status = "working";
		this._successListeners = [];
		this._failureListeners = [];
		this._completeListeners = [];
		this._isSuccessful = null;
	};
	
	//Gets and sets the status of this promise.
	/**
	* @fn		status
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.status =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.status = function() {
			return this._status;
	};
	
	//Gets and sets the value of the Promise
	/**
	* @fn		value
	* @brief	
	*
	* @param[in]/[out]	: val
	* @return			: Obj.prototype.value =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.value = function(val) {
		if(typeof val !== "undefined") {
			this._value = val;
			return this;
		}
		else {
			return this._value;
		}
	};
	
	//Sets a timeout for when this Promise will fail.
	/**
	* @fn		setTimeout
	* @brief	
	*
	* @param[in]/[out]	: ms
	* @return			: Obj.prototype.setTimeout =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setTimeout = function(ms) {
		if(this.isDone()) {
			return false;
		}
		var self = this;
		if(self._timeout) {
			clearTimeout(self._timeout);
		}
		self._timeout = setTimeout(function(){
			self._reportTimeout.call(self); 
		}, ms);
		return this;
	};
	
	/**
	* @fn		isSuccessful
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isSuccessful =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isSuccessful = function() {
		return this._isSuccessful;
	};
	
	//Use this function to provide a callback function for when this Promise is successfully completed.
	/**
	* @fn		onSuccess
	* @brief	
	*
	* @param[in]/[out]	: callback
	* @return			: Obj.prototype.onSuccess =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onSuccess = function(callback) {
		if(this.isDone()) {
			if(this.isSuccessful()) {
				callback(this.value());
			}
		}
		else {
			this._successListeners.push(callback);
		}
		return this;
	};
	
	//Use this function to provide a callback function for when this Promise has failed or timed out.
	/**
	* @fn		onFailure
	* @brief	
	*
	* @param[in]/[out]	: callback
	* @return			: Obj.prototype.onFailure =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onFailure = function(callback) {
		if(this.isDone()) {
			if(!this.isSuccessful()) {
			callback(this.value());
		}
		}
		else {
			this._failureListeners.push(callback);
		}
		return this;
	};

	//Use this function to provide a callback function for when this Promise is completed, whether successful or not.
	/**
	* @fn		onComplete
	* @brief	
	*
	* @param[in]/[out]	: callback
	* @return			: Obj.prototype.onComplete =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onComplete = function(callback) {
		if(this.isDone()) {
			callback(this.value());
		}
		else {
			this._completeListeners.push(callback);
		}
		return this;
	};
	
	//Use this function to report the success of this Promise and to pass back arguments to any success/complete callback functions.
	/**
	* @fn		reportSuccess
	* @brief	
	*
	* @param[in]/[out]	: args
	* @return			: Obj.prototype.reportSuccess =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.reportSuccess = function(args) {
        if(this._status !== "working") { 
			return false; 
		}
		
        this._isSuccessful = true;
		clearTimeout(this._timeout);
		this.value(args);
        this._status = "success";
		for(var i = 0; i < this._successListeners.length; i++) {
			this._successListeners[i](this.value());
		}
        this._onComplete();
	};
	
	//Use this function to report the failure of this Promise and to pass back arguments to any failure/complete callback functions.
	/**
	* @fn		reportFailure
	* @brief	
	*
	* @param[in]/[out]	: args
	* @return			: Obj.prototype.reportFailure =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.reportFailure = function(args) {
		clearTimeout(this._timeout);
        if(this._status !== "working") { 
			return false; 
		}
        this._isSuccessful = false;
		clearTimeout(this._timeout);
		this.value(args);
		this._status = this._timedOut ? "timeout" : "failure";
        for(var i = 0; i < this._failureListeners.length; i++) {
			this._failureListeners[i](args);
		}
        this._onComplete(args);
	};
	
	//Returns a Boolean indicating whether this Promise is complete.
	/**
	* @fn		isDone
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isDone =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isDone = function() {
		if(this._status === "working") {
			return false; 
		}
		else {
			return true; 
		}
	};
	
	//Internal function for firing complete callback functions and then cleaning up.
	/**
	* @fn		_onComplete
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype._onComplete =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype._onComplete = function() {
		for(var i = 0; i < this._completeListeners.length; i++) {
			this._completeListeners[i](this.value());
		}
		delete this._successListeners;
		delete this._failureListeners;
		delete this._completeListeners;
	};
	
	//Internal function for aborting the Promise and notifying callback functions of failure.
	/**
	* @fn		_reportTimeout
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype._reportTimeout =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype._reportTimeout = function() {
		clearTimeout(this._timeout);
		this._timedOut = true;
        this.reportFailure();
	};
	
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj);
	}
	return Obj;
}());

if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}

//The utils namespace is for storing common functions that are accessed by multiple other namespaces.
/**
 * @brief utils Model.
 * @details A BluePrint of utils Model
 * @return Null
 */
webapis.adframework.utils = (function() {
	"use strict";
	//Stuff that's not public but we use internal to the utilities class
	var flatTimeOffsetRegex = /\s*(?:(?:(\d*):)?(\d*):)?(\d+)?s*/; //modified by amit tyagi
	
	//MIME type regexes
	var regexHLS = /(application\/x-mpegURL\s*$)|(vnd\.apple\.mpegURL\s*$)|(audio\/x-mpegurl\s*$)/i;
	var regexSmooth = /(vnd\.ms-sstr\+xml\s*$)/i;
	var regexDash = /(dash\+xml\s*$)/i;
	var regexXML = /(text\/xml\s*$)/i;
	var regexGIF = /(image\/gif\s*$)/i;
	var regexJPEG = /(image\/jpe?g\s*$)/i;
	var regexPNG = /(image\/png\s*$)/i;
	var regexJS = /(application\/x?-?javascript\s*$)/i;
	var regexAVI = /(video\/avi)/i;
	var regexMP4 = /(video\/mp4)/i;
	var regexFlash = /(application\/x?-?shockwave-flash\s*$)|(video\/x?-?flv\s*$)/i;
	
	/**
	* @fn		log
	* @brief	
	*
	* @param[in]/[out]	: str
	* @return			: var log =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var log = function(str) {
		str = "[ADFW UTILS] " + str;
		if(webapis.adframework.config.get("DEBUG_CONSOLE_LOGS") === true) { 
			console.log(str, 1); 
		}
		
		if(webapis.adframework.config.get("DEBUG_ALERTS") === true) {
			console.log(str, 1); 
		}
		
		webapis.adframework.events.dispatch(webapis.adframework.events.DEBUG_MESSAGE, { message: str});
	};
	
	/**
	* @fn		error
	* @brief	
	*
	* @param[in]/[out]	: str
	* @return			: var error =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var error = function(str) { 
		log("[ERROR] " + str); 
	};
	
	//Why doesn't Javascript have this built-in??
	/**
	* @fn		parseBoolean
	* @brief	
	*
	* @param[in]/[out]	: string
	* @return			: var parseBoolean =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseBoolean = function(string){
		if(typeof string === "boolean") { 
			return string; 
		}
		
		else if(typeof string === "number") {
			if(string > 0) {
				return true;
			}
			else {
				return false;
			}
		}
		else if(typeof string === "string") {
			switch (string.toLowerCase().trim()) {
				case "true":
				case "yes":
				case "1":
					return true;
				case "false":
				case "no":
				case "0":
				case null:
					return false;
				default:
					throw ("failed to parse boolean from " + string);
			}
		}
		else {
			;/*NULL*/
		}
	};
	
	
	//MIME Checkers: Returns true if a given string matches a certain MIME type.
	/**
	* @fn		isJSMIME
	* @brief	
	*
	* @param[in]/[out]	: string
	* @return			: var isJSMIME =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var isJSMIME = function(string) {
		return regexJS.test(string);
	};
	/**
	* @fn		isFlashMIME
	* @brief	
	*
	* @param[in]/[out]	: string
	* @return			: var isFlashMIME =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var isFlashMIME = function(string) {
		return regexFlash.test(string);
	};
	/**
	* @fn		isGIFMIME
	* @brief	
	*
	* @param[in]/[out]	: string
	* @return			: var isGIFMIME =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var isGIFMIME = function(string) {
		return regexGIF.test(string);
	};
	/**
	* @fn		isJPEGMIME
	* @brief	
	*
	* @param[in]/[out]	: string
	* @return			: var isJPEGMIME =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var isJPEGMIME = function(string) {
		return regexJPEG.test(string);
	};
	/**
	* @fn		isPNGMIME
	* @brief	
	*
	* @param[in]/[out]	: string
	* @return			: var isPNGMIME =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var isPNGMIME = function(string) {
		return regexPNG.test(string);
	};
	/**
	* @fn		isHLSMIME
	* @brief	
	*
	* @param[in]/[out]	: string
	* @return			: var isHLSMIME =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var isHLSMIME = function(string) {
		return regexHLS.test(string);
	};
	
	/**
	* @fn		isXMLMIME
	* @brief	
	*
	* @param[in]/[out]	: string
	* @return			: var isXMLMIME =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var isXMLMIME = function(string) {
		return regexXML.test(string);
	};
	
	/**
	* @fn		isSmoothMIME
	* @brief	
	*
	* @param[in]/[out]	: string
	* @return			: var isSmoothMIME =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var isSmoothMIME = function(string) {
		return regexSmooth.test(string);
	};
	
	/**
	* @fn		isDASHMIME
	* @brief	
	*
	* @param[in]/[out]	: string
	* @return			: var isDASHMIME =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var isDASHMIME = function(string) {
		return regexDash.test(string);
	};
	/**
	* @fn		isMP4MIME
	* @brief	
	*
	* @param[in]/[out]	: string
	* @return			: var isMP4MIME =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var isMP4MIME = function(string) {
		return regexMP4.test(string);
	};
	/**
	* @fn		isAVIMIME
	* @brief	
	*
	* @param[in]/[out]	: string
	* @return			: var isAVIMIME =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var isAVIMIME = function(string) {
		return regexAVI.test(string);
	};
	
	//Converts "HH:MM:SS" to milliseconds
	/**
	* @fn		getTimeInt
	* @brief	
	*
	* @param[in]/[out]	: hmsString
	* @return			: var getTimeInt =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var getTimeInt = function(hmsString) {
		
		if(typeof hmsString !== "string") {
			return null;
		}
		
		if(flatTimeOffsetRegex.test(hmsString)) {
			var timeArray = flatTimeOffsetRegex.exec(hmsString);
		
			var ms = null;
			if(timeArray[3]) { 
				ms = parseInt(timeArray[3]) * 1000;
				if(timeArray[2]) { 
					ms += parseInt(timeArray[2]) * 1000 * 60; 
					if(timeArray[1]) { 
						ms += parseInt(timeArray[1]) * 1000 * 60 * 60; 			
					} 
				}
			}
			return ms;
		} else {
			return null;
		}
	};
	
	//Given a numerator and denominator, returns a quotient and remainder
	var integerDivision = function(numerator, denominator) {
		var quo = Math.floor(numerator / denominator);
		var rem = numerator % denominator;
		return ({
			quotient: quo,
			remainder: rem
		});
	};
	
	//Given an integer and a desired string length, Returns a String padded with zeroes. Usage: pad(5, 3) //"005"
	var pad = function(original, width, padString) {
		padString = padString || "0";
		original = "" + original;
		var arr = [];
		arr.length = width - original.length + 1;
		return original.length >= width ? original : arr.join(padString) + original;
	};
	//Converts milliseconds to "HH:MM:SS.mmm"
	/**
	* @fn		getTimeString
	* @brief	
	*
	* @param[in]/[out]	: ms
	* @return			: var getTimeString =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var getTimeString = function(ms) {
		
		if(typeof ms !== "number") {
			return null;
		}
		
		var temp = null;
		
		temp = integerDivision(ms, 3600000);
		var hours = pad(temp.quotient, 2);
		ms = temp.remainder;
		
		temp = integerDivision(ms, 60000);
		var minutes = pad(temp.quotient, 2);
		ms = temp.remainder;
		
		temp = integerDivision(ms, 1000);
		var seconds = pad(temp.quotient, 2);
		
		var hmsString;
		
		if(temp.remainder) {
			ms = pad(temp.remainder, 3);
			hmsString = hours + ":" + minutes + ":" + seconds + "." + ms;
		}
		else {
			hmsString = hours + ":" + minutes + ":" + seconds;
		}
		return hmsString;
	};
	
	



	//Sends an async GET to a tracker's URL. It does not wait for or care about the result.
	/**
	* @fn		fireTrackerURL
	* @brief	
	*
	* @param[in]/[out]	: url
	* @return			: var fireTrackerURL =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var fireTrackerURL = function(url) {
		if(!url) {
			error("Unable to submit EventXHR. Tracker URL not available...");
			return false;
		}
		
		if(webapis.adframework.config.get("DISABLE_TRACKING_EVENTS") === true) {
			var x = url;
			if(x.length > 83) {
				try {
					x = x.substring(0,80) + "...";
				}
				catch(e) {
					; /*NULL*/
				}
			}
			if(!this.suppressWarnings) {
				this.suppressWarnings = 0;
			}
			
			if(this.suppressWarnings < 3) {
				log("WARNING: Tracking events are being suppressed because DISABLE_TRACKING_EVENTS is enabled");
				this.suppressWarnings++;
		}
			
			return false;
		}
		
		
		if(window.XMLHttpRequest) {
			try {
				var xmlhttp=new XMLHttpRequest();
				xmlhttp.open("GET",url,true);
				xmlhttp.timeout = 10000;
				xmlhttp.onreadystatechange=function() { 
					if(xmlhttp && xmlhttp.readyState === 4 && xmlhttp.status === 200) {
						xmlhttp = null;
					}
				};
				xmlhttp.ontimeout = function() {
					xmlhttp = null;
				};
				xmlhttp.onerror = function() {
					xmlhttp = null;
				};
				xmlhttp.send();
			}
			catch(e) {
				error("Unable to load XHR due to Exception: " + e);
			}
		}
		else {
			error("Unable to submit Event XHR. window.XMLHttpRequest not available...");
		}
	};
	
	//Performs an AJAX request to the given URL. Uses a Promise to perform an action when the request has completed/timed out/failed.
	/**
	* @fn		ajax
	* @brief	
	*
	* @param[in]/[out]	: url
	*					: promise
	*					: timeout
	* @return			: var ajax =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var ajax = function(url, promise, timeout) {
		if(!url || !promise) { 
			return false; 
		}
		
		timeout = timeout || webapis.adframework.config.get("AJAX_TIMEOUT") || 4444;
		
		var firedError = false;
		
		try {
			var xhr=new XMLHttpRequest();
			xhr.open("GET",url,true);
			xhr.timeout = timeout;
			xhr.onreadystatechange=function() { 
				if(xhr && xhr.readyState === 4 && xhr.status === 200) {
					promise.reportSuccess(xhr);
					try 
					{ 
						xhr.destroy(); 
						xhr = null; 
					} 
					catch(e)
					{
						; /*NULL*/
					}
					
				}
			};
			xhr.ontimeout = function() {
				if (!firedError) {
					log("ajax timeout");
					promise.reportFailure("ajax request timed out");
					firedError = true;
					try { 
						xhr.destroy(); 
						xhr = null; 
					} 
					catch(e) {
						; /*NULL*/
					}
				}
			};
			xhr.onerror = function() {
				if (!firedError) {
					promise.reportFailure("error during ajax retrieval");
					firedError = true;
					try { 
						xhr.destroy(); 
						xhr = null; 
					} 
					catch(e) {
						; /*NULL*/
					}
				}
			};
			xhr.send();
			xhr.timeout = timeout;
		}
		catch(e) {
			if(!firedError) { 
				promise.reportFailure("exception: " + e); 
				firedError = true;
			}
		}
	};	
	
	//Very cheesy way of detecting stream type. Only used for debug purposes.
	/**
	* @fn		detectVideoType
	* @brief	
	*
	* @param[in]/[out]	: url
	* @return			: var detectVideoType =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var detectVideoType = function(url) {
		var detectedVideoType = "progressive";
		
		if(typeof url === "undefined" || !url) {
			return detectedVideoType;
		}
		
		if((url.toLowerCase().indexOf("m3u8".toLowerCase(), url.length - "m3u8".length) !== -1) ||
			(url.toLowerCase().indexOf("COMPONENT=HLS".toLowerCase(), url.length - "COMPONENT=HLS".length) !== -1))
		{
			detectedVideoType = "HLS";
		}
		else if((url.toLowerCase().indexOf("ism/Manifest".toLowerCase(), url.length - "ism/Manifest".length) !== -1) ||
			(url.toLowerCase().indexOf("COMPONENT=SMOOTH".toLowerCase(), url.length - "COMPONENT=SMOOTH".length) !== -1))
		{
			detectedVideoType = "SMOOTH";
		}
		else if((url.toLowerCase().indexOf("isml/Manifest".toLowerCase(), url.length - "isml/Manifest".length) !== -1) ||
			(url.toLowerCase().indexOf("COMPONENT=SMOOTH".toLowerCase(), url.length - "COMPONENT=SMOOTH".length) !== -1))
		{
			detectedVideoType = "SMOOTH";
		}
		else if((url.toLowerCase().indexOf("mpd".toLowerCase(), url.length - "mpd".length) !== -1) || 
			(url.toLowerCase().indexOf("xml".toLowerCase(), url.length - "xml".length) !== -1) ||
			(url.toLowerCase().indexOf("COMPONENT=HAS".toLowerCase(), url.length - "COMPONENT=HAS".length) !== -1))
		{
			detectedVideoType = "DASH";
		}
		else {
			;/*NULL*/
		}
		return detectedVideoType;
	};
	
	var getVODUrl = function(url) {
		
		var finalUrl = url;
		var urlPostfix = "";
		
		if(url.toLowerCase().indexOf("m3u8".toLowerCase(), url.length - "m3u8".length) !== -1) {
			urlPostfix = "|COMPONENT=HLS";
			finalUrl += urlPostfix;
		}
		else if(url.toLowerCase().indexOf("ism/Manifest".toLowerCase(), url.length - "ism/Manifest".length) !== -1) {
			urlPostfix = "|COMPONENT=SMOOTH";
			finalUrl += urlPostfix;
		}
		else if(url.toLowerCase().indexOf("isml/Manifest".toLowerCase(), url.length - "isml/Manifest".length) !== -1) {
			urlPostfix = "|COMPONENT=SMOOTH";
			finalUrl += urlPostfix;
		}
		else if(url.toLowerCase().indexOf("mpd".toLowerCase(), url.length - "mpd".length) !== -1) {
			urlPostfix = "|COMPONENT=HAS";
			finalUrl += urlPostfix;
		}
		else if(url.toLowerCase().indexOf("xml".toLowerCase(), url.length - "xml".length) !== -1) {
			urlPostfix = "|COMPONENT=HAS";
			finalUrl += urlPostfix;
		}
		else {
			;/*NULL*/
		}
		return finalUrl;
	};

	/**
	 * A Custom Timer Class that has the ability to pause/resume/clear the timeout count down
	 * @param {Function} callback [description]
	 * @param {[int]}   delay    [millisecond]
	 * Usage
	 * var timer = new webapis.adframework.utils.Timer(function() {
     *    -- code --
	 * }, 1000);
	 * timer.pause(); // pausing timer
	 * timer.resume(); // resume countdown
	 */
	var Timer = function (callback, delay){
		var timerId, start, remaining = delay;
		this.pause = function(){
			window.clearTimeout(timerId);
			remaining -= new Date() - start;
		};
		this.resume = function(){
			start = new Date();
			timerId = window.setTimeout(callback, remaining);
		};
		this.reset = function(newDelay){
			window.clearTimeout(timerId);
			start = new Date();
			remaining = newDelay || remaining;
			timerId = window.setTimeout(callback, newDelay);
		};
		this.clear = function(){
			window.clearTimeout(timerId);
		};
		this.resume();
	};
	
	return {
		ajax: ajax,
		fireTrackerURL: fireTrackerURL,
		parseBoolean: parseBoolean,
		getTimeInt: getTimeInt,
		getTimeString: getTimeString,
		pad: pad,
		integerDivision: integerDivision,
		isHLSMIME: isHLSMIME,
		isDASHMIME: isDASHMIME,
		isSmoothMIME: isSmoothMIME,
		isMP4MIME: isMP4MIME,
		isAVIMIME: isAVIMIME,
		isXMLMIME: isXMLMIME,
		isJSMIME: isJSMIME,
		isFlashMIME: isFlashMIME,
		isGIFMIME: isGIFMIME,
		isJPEGMIME: isJPEGMIME,
		isJPGMIME: isJPEGMIME,
		isPNGMIME: isPNGMIME,
		
		log: log,
		error: error,
		Timer: Timer,
		
		detectVideoType: detectVideoType,
		getVODUrl: getVODUrl
	};
})();

if(typeof Object.freeze === "function") {
	Object.freeze(webapis.adframework.utils);
} //Freeze this object

if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}


/**
 * @brief Parser Model.
 * @details A BluePrint of Parser Model
 * @return Null
 */
webapis.adframework.Parser = (function() {
	"use strict";

	/**
	* @fn		log
	* @brief	
	*
	* @param[in]/[out]	: str
	* @return			: var log =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var log = function(str) {
		str = "[adframework PARSER] " + str;
		console.log(str, 1);
	};
	/**
	* @fn		error
	* @brief	
	*
	* @param[in]/[out]	: str
	* @return			: var error =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var error = function(str) { 
		log("[ERROR] " + str); 
	};
	
	//Checks if a particular XML document is MAST.
	/**
	* @fn		isMASTXML
	* @brief	
	*
	* @param[in]/[out]	: xml
	* @return			: var isMASTXML =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var isMASTXML = function(xml) {
		if(!xml || !xml.documentElement || !xml.documentElement.tagName) { 
			return false; 
		}
		var rootName = xml.documentElement.tagName.toLowerCase();
		if(rootName.indexOf("mast") >= 0) { 
			return true; 
		}
		return false;
	};
	
	//Checks if a particular XML document is VAST.
	/**
	* @fn		isVASTXML
	* @brief	
	*
	* @param[in]/[out]	: xml
	* @return			: var isVASTXML =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var isVASTXML = function(xml) {
		if (!xml || !((xml.documentElement && xml.documentElement.tagName) || xml.tagName)) {
            return false;
        }
        var rootName;

        if(xml.documentElement) {
            rootName = xml.documentElement.tagName.toLowerCase();
            if (rootName.indexOf("vast") >= 0) {
                return true;
            }
        }
        else if(xml.tagName) {
            rootName = xml.tagName.toLowerCase();
            if (rootName.indexOf("vast") >= 0) {
                return true;
            }
        }
		else {
			;/*NULL*/
		}

        return false;
	};
	
	
	//Checks if a particular XML document is VMAP.
	/**
	* @fn		isVMAP
	* @brief	
	*
	* @param[in]/[out]	: xml
	* @return			: var isVMAP =
	* @warning			: None
	* @exception		: None
	* @see
	*/
    var isVMAP = function(xml) {
        if (!xml || !((xml.documentElement && xml.documentElement.tagName) || xml.tagName)) {
            return false;
        }
        var rootName;
        if(xml.documentElement) {
            rootName = xml.documentElement.tagName.toLowerCase();
            if (rootName.indexOf("vmap") >= 0) {
                return true;
            }
        }
        else if(xml.tagName) {
            rootName = xml.tagName.toLowerCase();
            if (rootName.indexOf("vmap") >= 0) {
                return true;
            }
        }
		else {
			;/*NULL*/
		}
        
        return false;
    };
	//Deep-clone something. Allows scope management.
	/**
	* @fn		copy
	* @brief	
	*
	* @param[in]/[out]	: item
	* @return			: var copy =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var copy = function(item) {
		if (item) {
			return JSON.parse(JSON.stringify(item));
		} else {
			return null;
		}
	};	
	//Sends a VAST parsing error to all of the parsing error URLs in the current context.
	/**
	* @fn		sendVSuiteParseError
	* @brief	
	*
	* @param[in]/[out]	: code
	*					: context
	*					: message
	* @return			: var sendVSuiteParseError =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var sendVSuiteParseError = function(code, context, message) {
		var eMessage = message ? message : webapis.adframework.Errors[code];
		error(code + " | " + eMessage);
		webapis.adframework.events.dispatch("PARSING_ERROR", { message: eMessage, code: code });
		if (context && context.adParseErrorURLs) {
			for (var i = 0; i < context.adParseErrorURLs.length; i++) {
				var url = context.adParseErrorURLs[i];
				url = webapis.adframework.MacroHelper.replaceErrorMacros(url, code, eMessage);
				webapis.adframework.utils.fireTrackerURL(url);
			}
		}
	};
	
	//Parses a MAST or VAST URL.
	//Returns either [webapis.adframework.Adbreak] or [webapis.adframework.Ad]
	/**
	* @fn		parse
	* @brief	
	*
	* @param[in]/[out]	: url
	*					: myPromise
	*					: context
	* @return			: var parse =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parse = function(url, myPromise, context) {
	log("XML URL : "+url);
		var ajaxPromise = new webapis.adframework.Promise();
		ajaxPromise.onSuccess(function(xhr) {
		var xml = xhr.responseXML;
			if (isMASTXML(xml)) {
				webapis.adframework.MastParser.parseMAST(xml, myPromise);
			}else if (isVMAP(xml)) {
                webapis.adframework.VMAPParser.parseVMAP(xml, myPromise); 
			}else if (isVASTXML(xml)) {
				webapis.adframework.VastParser.parseVAST(xml, myPromise, context);
			} else {
				sendVSuiteParseError(101, context);
				myPromise.reportFailure("URL does not point to a VMAP/VAST document");
			}
		}).onFailure(function(result) {
			if (ajaxPromise.status === "timeout") {
				myPromise.reportFailure("xhr to " + url + " timed out");
			} else {
				myPromise.reportFailure("xhr to " + url + " failed: " + result);
			}
		}).setTimeout(webapis.adframework.config.get("AD_RETRIEVAL_TIMEOUT"));
		webapis.adframework.utils.ajax(url, ajaxPromise);
	};
	
	//VAST Parsing Context - refreshes the Context that reflects the state of parsing.
    var getNewContext = function(oldContext) {
        if (!oldContext) {
            oldContext = {};
        }
        if (!oldContext.timestamp) {
            oldContext.timestamp = new Date();
        }
        if (typeof oldContext.adParseErrorURLs === 'undefined') {
            oldContext.adParseErrorURLs = [];
        } //URLs to call if VAST parse errors occur
        if (+oldContext.depth !== oldContext.depth) { //not NUMBER
            oldContext.depth = 1;
        } //Depth of wrapper ad parsing
        if (typeof oldContext.impressionURLs === 'undefined') {
            oldContext.impressionURLs = [];
        } //List of Ad Impression URLs from wrappers
        if (typeof oldContext.errorURLs === 'undefined') {
            oldContext.errorURLs = [];
        } //List of Ad Error URLs from wrappers. Not the same as parsing error URLs
        if (typeof oldContext.linearCreativeTrackerTemp === 'undefined') {
            oldContext.linearCreativeTrackerTemp = [];
        } //List of Linear Creative trackers from wrapper ads 
        if (typeof oldContext.linearCreativeClicksTemp === 'undefined') {
            oldContext.linearCreativeClicksTemp = [];
        } //List of Linear Creative click trackers from wrapper ads 
        if (typeof oldContext.nonLinearCreativeTrackerTemp === 'undefined') {
            oldContext.nonLinearCreativeTrackerTemp = [];
        } //List of NonLinear Creative trackers from wrapper ads
        if (typeof oldContext.nonLinearCreativeClicksTemp === 'undefined') {
            oldContext.nonLinearCreativeClicksTemp = [];
        } //List of NonLinear Creative click trackers from wrapper ads 
        if (typeof oldContext.companionCreativeNode === 'undefined') {
            oldContext.companionCreativeNode = [];
        } //Store companionCreativeNode for later to parse
        if (typeof oldContext.followAdditionalWrappers === 'undefined') {
            oldContext.followAdditionalWrappers = true;
        } //Whether or not to follow additional wrappers
        if (typeof oldContext.allowMultipleAds === 'undefined') {
            oldContext.allowMultipleAds = true;
        } //Whether or not to allow multiple ads incoming from additional wrappers. If not, take the first Standalone ad.
        if (typeof oldContext.followRedirects === 'undefined') {
            oldContext.followRedirects = true;
        } //Whether or not to follow redirects
        if (typeof oldContext.globalVMAPExtensions === 'undefined') {
            oldContext.globalVMAPExtensions = [];
        } //Global VMAP extensions

        var newContext = copy(oldContext);
        newContext.timestamp = new Date(newContext.timestamp);
        return newContext;
    };
	
	
	return {
		parse: parse,
		sendVSuiteParseError: sendVSuiteParseError,
		isVASTXML : isVASTXML,
		getNewContext: getNewContext
	};
}());

if(typeof window.webapis.adframework !== "object") {
	window.webapis.adframework = {}; 
}
/**
 * @brief MastParser Model.
 * @details A BluePrint of MastParser Model
 * @return Null
 */
webapis.adframework.MastParser = (function() {
	"use strict";
	
	/**
	* @fn		getAds
	* @brief	
	*
	* @param[in]/[out]	: source
	*					: myPromise
	* @return			: var getAds =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var getAds = function(source, myPromise){
		if(source.Format === "vast") {
						
			var ajaxPromise = new webapis.adframework.Promise();
			ajaxPromise.onSuccess(function(xhr) {
				var xml = xhr.responseXML;
				if (xml && webapis.adframework.Parser.isVASTXML(xml)) {
		
					var ajaxPromise_new = new webapis.adframework.Promise();
					ajaxPromise_new.onSuccess(function(ads) {
						if(ads) {
							ads.sort(webapis.adframework.Ad.Sort);
							for (var c = 0, c1 = ads.length; c < c1; ++c) {
								ads[c].setTarget(source.Target);
							}
						}
						myPromise.reportSuccess(ads);
					});
					webapis.adframework.VastParser.parseVAST(xml, ajaxPromise_new);
				}
				else{
					webapis.adframework.Parser.sendVSuiteParseError(101, null, "Invalid VAST url");
					myPromise.reportFailure("URL does not point to a VAST document");
				}
			}).onFailure(function(result) {
				if (ajaxPromise.status === "timeout") {
					myPromise.reportFailure("xhr to " + source.Uri + " timed out");
				} else {
					myPromise.reportFailure("xhr to " + source.Uri + " failed: " + result);
				}
			}).setTimeout(webapis.adframework.config.get("AD_RETRIEVAL_TIMEOUT"));
			webapis.adframework.utils.ajax(source.Uri, ajaxPromise);
		}
	};
	//Parse Trigger element 
	/**
	* @fn		loadTriggersFromMAST
	* @brief	
	*
	* @param[in]/[out]	: triggerObj
	*					: myPromise
	* @return			: var loadTriggersFromMAST =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var loadTriggersFromMAST = function(triggerObj, myPromise) {
		if(triggerObj ) {
			var final_adlist = [];
			var source = triggerObj.getSource();
			var promiseList = new webapis.adframework.PromiseList();
			var adBreak = null;
			promiseList.onComplete(function() {
				if(final_adlist) {
					var offsetParams = {
						startCondition: triggerObj.getStartCond(),
						endCondition: triggerObj.getEndCond()
					};
					adBreak = new webapis.adframework.BreakInfo({
						offset: offsetParams,
						breakType: "linear",
						breakID: triggerObj.ID,
						eventTrackers: [],
						errorTrackers: [],
						ads: final_adlist
					});
					}
				myPromise.reportSuccess(adBreak);
			});
				
			for (var b = 0, bl = source.length; b < bl; ++b) {
				var adbreakPromise = new webapis.adframework.Promise();
				adbreakPromise.onSuccess(function(ads) {
					if(ads) {
						for (var c = 0, c1 = ads.length; c < c1; ++c) {
							final_adlist.push(ads[c]);
						}
					}
				}).onFailure(function() {
					final_adlist = null;
				});
					
				promiseList.add(adbreakPromise);
				getAds(source[b], adbreakPromise);
			}
			promiseList.start();
		}
	};
	
	
	//Parse MAST -  parse conditions for a trigger
	/**
	* @fn		parseCondition
	* @brief	
	*
	* @param[in]/[out]	: adEle
	* @return			: var parseCondition =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseCondition = function(adEle) {
		var condition = [];
		var children = adEle.childNodes;
		for (var a = 0, al = children.length; a < al; ++a) {
			var child = children[a];
			switch(child.localName) {
				case "condition":			
					var Type = child.getAttribute("type");
					var Name = child.getAttribute("name");
					var Value = child.getAttribute("value");
					if(Value && Value.toLowerCase().trim() === "true") {
						Value = true;
					}
					else if(Value && Value.toLowerCase().trim() === "false") {
						Value = false;
					}
					else {
						;/*NULL*/
					}
					var Operator = child.getAttribute("operator");	
					var Child_Condition = parseCondition(child);	
					var Obj = new webapis.adframework.Condition({
						type : Type.trim(),
						name : Name.trim(),
						value : Value,
						operator: Operator,
						child_condition : Child_Condition
					});
					condition.push(Obj);
					break;
				
				default:
					break;
			}
		}
		return condition;
	};
	/**
	* @fn		parseTarget
	* @brief	
	*
	* @param[in]/[out]	: adEle
	* @return			: var parseTarget =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseTarget = function(adEle) {
		var target_list = [];
		var children = adEle.childNodes;
		for (var a = 0, al = children.length; a < al; ++a) {
			var child = children[a];
			switch(child.localName) {
				case "target":	
					var Region = child.getAttribute("region");
					var Type = child.getAttribute("type");		
					var Child_target = parseTarget(child);			
					var Obj = new webapis.adframework.Target({
						Region : Region.trim(),
						Type : Type.trim(),
						Child_target : Child_target
					});
					target_list.push(Obj);
					break;
					
				default:
					break;
			}
		}
		return target_list;
	};
	//Parse MAST -  parse sources for a trigger
	var parseSource;
	/**
	* @fn		parseSources
	* @brief	
	*
	* @param[in]/[out]	: adEle
	* @return			: var parseSources =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseSources = function(adEle) {	
		var source = [];
		var children = adEle.childNodes;
		for (var a = 0, al = children.length; a < al; ++a) {
			var child = children[a];
			switch(child.localName) {
				case "source":			
					var Obj = parseSource(child);	
					source.push(Obj);					
					break;	
				
				default:
					break;
			}
		}
		return source; 
	};
	//Parse MAST -  parses an individual source
	/**
	* @fn		parseSource
	* @brief	
	*
	* @param[in]/[out]	: adEle
	* @return			: parseSource =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	parseSource = function(adEle) {
		var Uri = adEle.getAttribute("uri");
		var Format = adEle.getAttribute("format");
		var children = adEle.childNodes;
		var Child_source = null;
		var Target = null;
		for (var a = 0, al = children.length; a < al; ++a) {
			var child = children[a];
			switch(child.localName) {
				case "sources":			
					Child_source = parseSources(child);			
					break;	
					
				case "targets":			
					Target = parseTarget(child);	
					break;	
					
				default:
					break;
			}
		}			
		
		var Obj = {
			Uri : Uri.trim(),
			Format : Format.trim(),
			Child_source : Child_source,
			Target : Target
		};
		return Obj;
	};
	
	//Parse MAST - Helper function - parses an individual trigger
	/**
	* @fn		parseTriggerElement
	* @brief	
	*
	* @param[in]/[out]	: adEle
	* @return			: var parseTriggerElement =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseTriggerElement = function(adEle) {
		var ID = adEle.getAttribute("id");
		var Description = adEle.getAttribute("description");
		var children = adEle.childNodes;
		for (var a = 0, al = children.length; a < al; ++a) {
			var child = children[a];
			switch(child.localName) {
				case "startConditions":			
					var startcondition = parseCondition(child);								
					break;	
					
				case "endConditions":								
					var endcondition = parseCondition(child);											
					break;		
					
				case "sources":								
					var source = parseSources(child);														
					break;
					
				default:
					break;
			}
		}
		
		var trigger = new webapis.adframework.Trigger({
			ID : ID,
			Description : Description,
			startcondition : startcondition,
			endcondition: endcondition,
			source: source
		});
		return trigger;
	};
	
	/**
	* @fn		parseMAST
	* @brief	
	*
	* @param[in]/[out]	: xml
	*					: myPromise
	* @return			: var parseMAST =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseMAST = function(xml, myPromise) {
		if(!xml || !xml.documentElement || !xml.documentElement.tagName) { 
			return;
		}
		var rootName = xml.documentElement.tagName.toLowerCase();
		if(rootName.indexOf("mast") < 0) { 
			return; 
		}

		var triggerElements = xml.getElementsByTagName("trigger");
		var adBreaks = []; //A list of AdBreak objects

		//I promise to send a list of adbreaks when I'm done
		var promiseList = new webapis.adframework.PromiseList();
		promiseList.onComplete(function() {
			myPromise.reportSuccess(adBreaks);
		});

		//For each trigger in the XML...
		for (var i = 0; i < triggerElements.length; i++) {
			var adbreakPromise = new webapis.adframework.Promise();
			var triggerObj = parseTriggerElement(triggerElements[i]);
			adbreakPromise.onSuccess(function(adBreak) {
				if(adBreak){
					adBreaks.push(adBreak);
				}
			});
			promiseList.add(adbreakPromise);
			loadTriggersFromMAST(triggerObj, adbreakPromise);
		}
		promiseList.start();
	};
	
	
	return {
		parseMAST: parseMAST
	};
}());

if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}

/**
 * @brief VastParser Model.
 * @details A BluePrint of VastParser Model
 * @return Null
 */
webapis.adframework.VastParser = (function() {
	
	"use strict";

	/**
	* @fn		log
	* @brief	
	*
	* @param[in]/[out]	: str
	* @return			: var log =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var log = function(str) {
		str = "[adframework VAST PARSER] " + str;
		console.log(str, 1);
	
	};
	/**
	* @fn		error
	* @brief	
	*
	* @param[in]/[out]	: str
	* @return			: var error =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var error = function(str) { 
		log("[ERROR] " + str); 
	};
	
	//Variable Definitions that get used over and over - we want to keep them up here as to not overinstantiate them and cause performance issues (i.e. these variables belong to the Class, not a Function)
	
	//The progress events
	var progressRegex = new RegExp("\\s*progress\\s*", "i");
	var firstQuartileRegex = new RegExp("\\s*firstQuartile\\s*", "i");
	var midpointRegex = new RegExp("\\s*midpoint\\s*", "i");
	var thirdQuartileRegex = new RegExp("\\s*thirdQuartile\\s*", "i");
	
	//Other one-time tracker events
	var startRegex = new RegExp("\\s*start\\s*", "i");
	var creativeViewRegex = new RegExp("\\s*creativeView\\s*", "i");
	var completeRegex = new RegExp("\\s*complete\\s*", "i");
	var skipRegex = new RegExp("\\s*skip\\s*", "i");
	
	
	
	//Magical XML node value getter for the lazy - gets you the textContent of the first node in a list of nodes (or single node) that you provide. Good if you know you've only got one node to care about.
	/**
	* @fn		getSingleNodeValue
	* @brief	
	*
	* @param[in]/[out]	: xmlNodes
	* @return			: var getSingleNodeValue =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var getSingleNodeValue = function(xmlNodes) {
		var val = null;
		if (typeof xmlNodes === "string") {
			return xmlNodes;
		}
		if (xmlNodes && (xmlNodes instanceof NodeList || xmlNodes instanceof HTMLCollection) && xmlNodes[0]) {
			val = xmlNodes[0].textContent.trim();
		} else if (xmlNodes instanceof Node || xmlNodes instanceof Element) {
			if(xmlNodes && xmlNodes.childNodes && xmlNodes.childNodes[0] && xmlNodes.childNodes[0].textContent.trim()) {
				val = xmlNodes.childNodes[0].textContent.trim();
			} else if (xmlNodes && xmlNodes.textContent.trim()) {
				val = xmlNodes.textContent.trim();
			}
			else {
				;/*NULL*/
			}
		}
		else {
				;/*NULL*/
		}
		return val;
	};
	
		//Magical XML node value getter for the lazy - gets you the textContents of all the nodes you provide, as a list.
	/**
	* @fn		getMultipleNodeValues
	* @brief	
	*
	* @param[in]/[out]	: xmlNodes
	* @return			: var getMultipleNodeValues =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var getMultipleNodeValues = function(xmlNodes) {
		var valueList = [];

		if (xmlNodes && (xmlNodes instanceof NodeList || xmlNodes instanceof HTMLCollection) && xmlNodes.length > 0) {
			for (var i = 0; i < xmlNodes.length; i++) {
				valueList.push(getSingleNodeValue(xmlNodes[i]));
			}
		} else if (xmlNodes instanceof Node) {
			if (xmlNodes && xmlNodes.childNodes && xmlNodes.childNodes[0] && xmlNodes.childNodes[0].textContent.trim()) {
				valueList.push(xmlNodes.childNodes[0].textContent.trim());
			} else if (xmlNodes && xmlNodes.textContent.trim()) {
				valueList.push(xmlNodes.textContent.trim());
			}
			else {
				;/*NULL*/
			}
		}
		else {
				;/*NULL*/
		}
		return valueList;
	};
	
	//Convert a list of XML nodes into Error trackers
	/**
	* @fn		parseErrorNodes
	* @brief	
	*
	* @param[in]/[out]	: errorNodes
	* @return			: var parseErrorNodes =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseErrorNodes = function(errorNodes) {
		var errorTrackers = [];
		if (!errorNodes || !errorNodes.length) {
			return errorTrackers;
		}
		for (var i = 0; i < errorNodes.length; i++) {
			errorTrackers.push(new webapis.adframework.ErrorTracker(getSingleNodeValue(errorNodes[i])));
		}

		return errorTrackers;
	};

	//Convert a list of XML nodes into Impression trackers
	/**
	* @fn		parseImpressionNodes
	* @brief	
	*
	* @param[in]/[out]	: impressionNodes
	* @return			: var parseImpressionNodes =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseImpressionNodes = function(impressionNodes) {
		var impressionTrackers = [];
		if (!impressionNodes || !impressionNodes.length) {
			return impressionTrackers;
		}
		for (var i = 0; i < impressionNodes.length; i++) {
			impressionTrackers.push(new webapis.adframework.OneTimeTracker("impression", getSingleNodeValue(impressionNodes[i])));
		}

		return impressionTrackers;
	};

	//Parse Trackers from a list of click tracking nodes. Returns a list of webapis.adframework.Tracker objects.
	/**
	* @fn		parseClickTrackingNodes
	* @brief	
	*
	* @param[in]/[out]	: clickTrackingNodes
	* @return			: var parseClickTrackingNodes =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseClickTrackingNodes = function(clickTrackingNodes) {
		var trackers = [];

		for (var i = 0; i < clickTrackingNodes.length; i++) {
			trackers.push(new webapis.adframework.ClickTracker(clickTrackingNodes[i].getAttribute("id"), clickTrackingNodes[i].textContent));
		}

		return trackers;
	};

	//Parse Trackers from a list of event tracking nodes. Returns a list of webapis.adframework.Tracker objects.
	/**
	* @fn		parseTrackerNodes
	* @brief	
	*
	* @param[in]/[out]	: trackingNodes
	* @return			: var parseTrackerNodes =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseTrackerNodes = function(trackingNodes) {

		var trackers = [];
		for (var i = 0; i < trackingNodes.length; i++) {
			if (trackingNodes[i].getAttribute("event")) {
				var trackerID = trackingNodes[i].getAttribute("event");
				var trackerURL = getSingleNodeValue(trackingNodes[i]);
				if (firstQuartileRegex.test(trackerID)) {
					trackers.push(new webapis.adframework.OffsetTracker(trackerID, trackerURL, "25%"));
				} else if (midpointRegex.test(trackerID)) {
					trackers.push(new webapis.adframework.OffsetTracker(trackerID, trackerURL, "50%"));
				} else if (thirdQuartileRegex.test(trackerID)) {
					trackers.push(new webapis.adframework.OffsetTracker(trackerID, trackerURL, "75%"));
				} else if (progressRegex.test(trackerID)) {
					trackers.push(new webapis.adframework.OffsetTracker(trackerID, trackerURL, trackingNodes[i].getAttribute("offset")));
				} else if (startRegex.test(trackerID) || creativeViewRegex.test(trackerID) || completeRegex.test(trackerID) || skipRegex.test(trackerID)) {
					trackers.push(new webapis.adframework.OneTimeTracker(trackerID, trackerURL));
				} else {
					trackers.push(new webapis.adframework.Tracker(trackerID, trackerURL));
				}
			}
		}
		return trackers;
	};
	
	var companionParser = {
		//Main companion Parser.
		//Input: companionNodes
		//Output: companionCreativeObjects creativeObject
		companionNodesToCompanionCreative : function(creativeNode, companionNodes){

			var companionNodeArray = Array.prototype.slice.call(companionNodes),
				companionObjects = [],
				creativeObject =[],
				resourcesList = [];

			//Loop Thru companion
			for (var i = 0; i < companionNodeArray.length; i++) {
				var node = companionNodeArray[i];
				//Parsing CompansionResource
				resourcesList = companionParser.companionNodeToResourceObjects(node);

				if (!resourcesList || !resourcesList.length) {
                    sendVSuiteParseError(603, {}, "Unable to fetch CompanionAds/Companion resource.");
                    return null;
                }
				
				var altTextNode = node.getElementsByTagName("AltText")[0] ? node.getElementsByTagName("AltText")[0] : '',
					trackingEventsNode = node.getElementsByTagName("TrackingEvents")[0] ? node.getElementsByTagName("TrackingEvents")[0] : null;

				//Parse TrackingEvents
				var eventTrackerList = [],
					trackingNodes = trackingEventsNode?trackingEventsNode.getElementsByTagName("Tracking"):null;
				if (trackingNodes && trackingNodes.length > 0) {
					for (var j = 0; j < trackingNodes.length; j++) {
						var trackingNode = trackingNodes[j];
						var event = trackingNode.getAttribute("event");
						var url = getSingleNodeValue(trackingNode);
						if (event && url) {
							eventTrackerList.push(new webapis.adframework.OneTimeTracker(event, url));
						}
					}
				} else {
					log("No Tracker nodes detected in VAST Companion...");
				}

				companionObjects.push(new webapis.adframework.Companion({
					width: node.getAttribute("width"),
					height: node.getAttribute("height"),
					id: node.getAttribute("id") ? node.getAttribute("id") : null,
					assetWidth: node.getAttribute("assetWidth") ? node.getAttribute("assetWidth") : null,
					assetHeight: node.getAttribute("assetHeight") ? node.getAttribute("assetHeight") : null,
					expandedWidth: node.getAttribute("expandedWidth") ? node.getAttribute("expandedWidth") : null,
					expandedHeight: node.getAttribute("expandedHeight") ? node.getAttribute("expandedHeight") : null,
					adSlotID: node.getAttribute("adSlotID") ? node.getAttribute("adSlotID") : null,

					resources: resourcesList,
					altText: getSingleNodeValue(altTextNode),
					eventTrackers: eventTrackerList,
					apiFramework: node.getAttribute("apiFramework"),
					adParameters: node.getAttribute("adParameters")
				}));

			}

			var creativeID = creativeNode.getAttribute("id"),
				creativeSequence = creativeNode.getAttribute("sequence"),
				creativeAdID = creativeNode.getAttribute("adID"),
				creativeAPIFramework = creativeNode.getAttribute("apiFramework"),
				required = creativeNode.getElementsByTagName("CompanionAds")[0].getAttribute("required");

			creativeObject = new webapis.adframework.CompanionCreative({
				//General Creative stuff
				id: creativeID,
				sequence: creativeSequence,
				adID: creativeAdID,
				apiFramework: creativeAPIFramework,
				//Variables specific to Companion
				companions: companionObjects,
				required: required ? required : null

			});

		return creativeObject;
		},
		//Parse Companion Resources.
		//Input: companionNode
		//Output: companionResourceObjects Array
		companionNodeToResourceObjects : function(companionNode) {
			var companionResourceObjects = [];
			//Parsing Resource
			//Companion Resource Elements - at least one [staticResource,IFrameResource,HTMLResource].
			var staticResource = companionNode.getElementsByTagName("StaticResource")[0],
				iFrameResource = companionNode.getElementsByTagName("IFrameResource")[0],
				htmlResource = companionNode.getElementsByTagName("HTMLResource")[0],
				companionClickThroughNode = companionNode.getElementsByTagName("CompanionClickThrough")[0],
				companionClickTrackingNode = companionNode.getElementsByTagName("CompanionClickTracking");
			var cCategory="";
			var cContent="";
			if (staticResource) {
				cContent = getSingleNodeValue(staticResource);
				cCategory = "STATIC";
				var creativeType = staticResource.getAttribute("creativeType"),
					clickThrough = getSingleNodeValue(companionClickThroughNode),
					clickTrackers = parseClickTrackingNodes(companionClickTrackingNode);

				companionResourceObjects.push(companionParser.companionResourceConverter(cContent, cCategory, creativeType, clickThrough, clickTrackers));
			}
			if (iFrameResource) {
				cContent = getSingleNodeValue(iFrameResource);
				cCategory = "IFRAME";

				companionResourceObjects.push(companionParser.companionResourceConverter(cContent, cCategory));
			}
			if (htmlResource) {
				cContent = getSingleNodeValue(htmlResource);
				cCategory = "HTML";

				companionResourceObjects.push(companionParser.companionResourceConverter(cContent, cCategory));
			}
			return companionResourceObjects;
		},
		//Create CompanionResources Object.
		companionResourceConverter : function(content_, category_, creativeType, clickThrough, clickTrackers) {
			return (new webapis.adframework.CompanionResource({
				content: content_,
				resourceCategory: category_,
				creativeType: creativeType || null,
				clickThrough: clickThrough || null,
				clickTrackers: clickTrackers || null
			}));
		}
	};

	var iconParser = {
		//Parse Icon.
		iconNodeToIconObjects : function(iconNode){
			var duration = webapis.adframework.utils.getTimeInt(iconNode.getAttribute("duration"));
			var offset = webapis.adframework.utils.getTimeInt(iconNode.getAttribute("offset"));

			var resourcesList = iconParser.iconNodeToResourceObjects(iconNode);
			return (new webapis.adframework.Icon({
					program: iconNode.getAttribute("program"),
					width: iconNode.getAttribute("width"),
					height: iconNode.getAttribute("height"),
					xPosition: iconNode.getAttribute("xPosition"),
					yPosition: iconNode.getAttribute("yPosition"),
					offset: offset,
					duration: duration,
					resources: resourcesList,
					apiFramework: iconNode.getAttribute("apiFramework")
				}));
		},
		//Parse Icon Resources.
		iconNodeToResourceObjects : function(iconNode) {
			var iconResourceObjects = [];
		//Parsing Resource
			var staticResource = iconNode.getElementsByTagName("StaticResource")[0],
				iFrameResource = iconNode.getElementsByTagName("IFrameResource")[0],
				htmlResource = iconNode.getElementsByTagName("HTMLResource")[0],
				iconClickThroughNode = iconNode.getElementsByTagName("IconClickThrough")[0],
				iconClickTrackingNode = iconNode.getElementsByTagName("IconClickTracking"),
				iconViewTrackingNode = iconNode.getElementsByTagName("IconViewTracking"),
				viewTrackers = parseClickTrackingNodes(iconViewTrackingNode);
				var iCategory = "";
				var iContent="";
			if (staticResource) {
				iContent = getSingleNodeValue(staticResource);
				iCategory = "STATIC";
				var	creativeType = staticResource.getAttribute("creativeType"),
					clickThrough = getSingleNodeValue(iconClickThroughNode),
					clickTrackers = parseClickTrackingNodes(iconClickTrackingNode);

				iconResourceObjects.push(iconParser.iconResourceConverter(iContent, iCategory, creativeType, clickThrough, clickTrackers, viewTrackers));
		}
			if (iFrameResource) {
				iContent = getSingleNodeValue(iFrameResource);
				iCategory = "IFRAME";

				iconResourceObjects.push(iconParser.iconResourceConverter(icontent, iCategory, null, null, null, viewTrackers));
		}
			if (htmlResource) {
				icontent = getSingleNodeValue(htmlResource);
				iCategory = "HTML";

				iconResourceObjects.push(iconParser.iconResourceConverter(icontent, iCategory, null, null, null, viewTrackers));
		}

			return iconResourceObjects;
		},
		//Create IconResources Object.
		iconResourceConverter : function(content_, category_, creativeType, clickThrough, clickTrackers, viewTrackers) {
			return (new webapis.adframework.IconResource({
			content: content_,
			resourceCategory: category_,
			creativeType: creativeType || null,
				clickThrough: clickThrough || null,
				clickTrackers: clickTrackers || null,
				viewTrackers: viewTrackers || null
		}));
		}
	};
	
	//How long do we have until we have to stop parsing?
	/**
	* @fn		getRetrievalTimeRemaining
	* @brief	
	*
	* @param[in]/[out]	: context
	* @return			: var getRetrievalTimeRemaining =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var getRetrievalTimeRemaining = function(context) {
		if (!context.timestamp) {
			context.timestamp = new Date();
		}
		var remaining = webapis.adframework.config.get("AD_RETRIEVAL_TIMEOUT") - (new Date() - context.timestamp);
		if (remaining < 300) {
			remaining = 0;
		} else {
			remaining -= (75 * context.depth);
		}
		return remaining;
	};
	
	//Checks if a particular XML document is VAST.
	/**
	* @fn		isVAST
	* @brief	
	*
	* @param[in]/[out]	: xml
	* @return			: var isVAST =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var isVAST = function(xml) {
		if (!xml || !xml.documentElement || !xml.documentElement.tagName) {
			return false;
		}
		var rootName = xml.documentElement.tagName.toLowerCase();
		if (rootName.indexOf("vast") >= 0) {
			return true;
		}
		return false;
	};
	
	/**
	* @fn		deepMergeHelper
	* @brief	
	*
	* @param[in]/[out]	: adStructure
	*					: currentSequence
	*					: inferSequence
	*					: inferences
	* @return			: var deepMergeHelper =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var deepMergeHelper = function(adStructure, currentSequence, inferSequence, inferences) {

		var sequenced = [];
		var unsequenced = [];
		var ad = null;
        if (!inferences) {
            inferences = {};
        }
		if (!currentSequence) {
			currentSequence = 1;
		}

		for (var i = 0; i < adStructure.length; i++) {
			ad = adStructure[i];
			if (ad instanceof webapis.adframework.Ad) {
				if(inferences.id) {
					ad.id = inferences.id;
				}
				if (ad.sequence || inferSequence) {
					ad.sequence = currentSequence;
					currentSequence++;
					sequenced.push(ad);
				} else {
					ad.sequence = null;
					unsequenced.push(ad);
				}
			} else {
				if(ad.id) { 
					inferences.id = ad.id; 
				}
				var deeperInference = inferSequence || ad.sequence;
				var deeper = deepMergeHelper(ad.ads, currentSequence, deeperInference);
				sequenced = sequenced.concat(deeper.sequenced);
				unsequenced = unsequenced.concat(deeper.unsequenced);
				currentSequence = deeper.currentSequence;
			}
		};
		
		return {
			sequenced: sequenced,
			unsequenced: unsequenced,
			currentSequence: currentSequence
		};
	};

	//After parsing VAST and wrappers, merges all of the ads together. The structure of the argument is a special one created during VAST parsing.
	//The structure is of nested maps. It's really ugly. Sorry.
	/**
	* @fn		deepMerge
	* @brief	
	*
	* @param[in]/[out]	: adStructure
	* @return			: var deepMerge =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var deepMerge = function(adStructure) {
		var merged = deepMergeHelper(adStructure);
		return merged.sequenced.concat(merged.unsequenced);
	};


	/**
	* @fn		parseMediaFilesNode
	* @brief	Parse Linear media files node. This function will return Linear mediaFiles
	*
	* @param[in]/[out]	: mediaFilesNode
	*					: context
	* @return			: mediaFiles
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseMediaFilesNode = function(mediaFilesNode, context) {
		var mediaFiles = [];
		for(var i = 0; i < mediaFilesNode.length; i++) {
			
			var mediaFileDelivery = mediaFilesNode[i].getAttribute("delivery");
			var mediaFileType = mediaFilesNode[i].getAttribute("type");
			var mediaFileURL = getSingleNodeValue(mediaFilesNode[i]);
			
			if(!mediaFileDelivery || !mediaFileDelivery.trim()) {
				webapis.adframework.Parser.sendVSuiteParseError(101, context, "Failed to parse MediaFile: Missing Delivery");
			} else if(!mediaFileType || !mediaFileType.trim()) {
				webapis.adframework.Parser.sendVSuiteParseError(101, context, "Failed to parse MediaFile: Missing Type");
			} else if(!mediaFileURL || !mediaFileURL.trim()) {
				webapis.adframework.Parser.sendVSuiteParseError(101, context, "Failed to parse MediaFile: Missing URL");
			} else {
				mediaFiles.push(new webapis.adframework.LinearMediaFile({
					url: mediaFileURL,
					type: mediaFileType,
					width: mediaFilesNode[i].getAttribute("width"),
					height: mediaFilesNode[i].getAttribute("height"),
					delivery: mediaFileDelivery,
					scalable: mediaFilesNode[i].getAttribute("scalable"),
					bitrate: mediaFilesNode[i].getAttribute("bitrate"),
					maxBitrate: mediaFilesNode[i].getAttribute("maxBitrate"),
					minBitrate: mediaFilesNode[i].getAttribute("minBitrate"),
					codec: mediaFilesNode[i].getAttribute("codec"),
					apiFramework: mediaFilesNode[i].getAttribute("apiFramework"),
					maintainAspectRatio: mediaFilesNode[i].getAttribute("maintainAspectRatio")
				}));
			}
		}
		
		return mediaFiles;
	};
	
	//Parse a Linear node. This function will return Linear instanceof CreativeNode
	/**
	* @fn		parseLinearNode
	* @brief	
	*
	* @param[in]/[out]	: linearNode
	*					: context
						: creativeID
						: creativeSequence
	*					: creativeAdID
						: creativeAPIFramework
	* @return			: creativeObject
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseLinearNode = function(linearNode, context, creativeID, creativeSequence, creativeAdID, creativeAPIFramework) {
		var creativeObject = null;
		var trackerURL = null;
		var trackerID = null;
		var skipOffset = linearNode.getAttribute("skipoffset");
		//TODO: Support ad parameters
		var adParametersNode = linearNode.getElementsByTagName("AdParameters");
		var adParameters = null;
		if(adParametersNode) {
			adParameters = getSingleNodeValue(adParametersNode);
		}
		
		var duration = getSingleNodeValue(linearNode.getElementsByTagName("Duration"));
		try {
			duration = webapis.adframework.utils.getTimeInt(duration);
			if(!duration || isNaN(duration)) {
				webapis.adframework.Parser.sendVSuiteParseError(101, context, "Failed to parse LinearCreative: Invalid Duration");
				return null;
			}
		} catch (e) {
			webapis.adframework.Parser.sendVSuiteParseError(101, context, "Failed to parse LinearCreative: Invalid Duration");
			return null;
		}

		//Parse ad media files
		
		var mediaFilesNode = linearNode.getElementsByTagName("MediaFile");
		var mediaFiles = parseMediaFilesNode(mediaFilesNode, context);
		if(!mediaFiles || !mediaFiles.length) {
			webapis.adframework.Parser.sendVSuiteParseError(101, context, "Failed to parse LinearCreative: Missing MediaFiles");
			return null;
		}
		
		//Parse ad trackers
		var trackerNodes = linearNode.getElementsByTagName("Tracking");
		var eventTrackers = parseTrackerNodes(trackerNodes);
		//Get trackers from parent wrappers

		if (context.linearCreativeTrackerTemp) {
			for (var x = 0; x < context.linearCreativeTrackerTemp.length; x++) {
				if (context.linearCreativeTrackerTemp[x].id) {
					trackerURL = null;
					trackerID = null;
					trackerID = context.linearCreativeTrackerTemp[x].id;
					trackerURL = context.linearCreativeTrackerTemp[x].url;

					if (firstQuartileRegex.test(trackerID)) {
						eventTrackers.push(new webapis.adframework.OffsetTracker(trackerID, trackerURL, "25%"));
					} else if (midpointRegex.test(trackerID)) {
						eventTrackers.push(new webapis.adframework.OffsetTracker(trackerID, trackerURL, "50%"));
					} else if (thirdQuartileRegex.test(trackerID)) {
						eventTrackers.push(new webapis.adframework.OffsetTracker(trackerID, trackerURL, "75%"));
					} else if (progressRegex.test(trackerID)) {
						eventTrackers.push(new webapis.adframework.OffsetTracker(trackerID, trackerURL, context.linearCreativeTrackerTemp[x].offset));
					} else if (startRegex.test(trackerID) || creativeViewRegex.test(trackerID) || completeRegex.test(trackerID) || skipRegex.test(trackerID)) {
						eventTrackers.push(new webapis.adframework.OneTimeTracker(trackerID, trackerURL));
					} else {
						eventTrackers.push(new webapis.adframework.Tracker(trackerID, trackerURL));
					}
					
				}
			}
		}

		var clickThrough = getSingleNodeValue(linearNode.getElementsByTagName("ClickThrough"));
		var clickTrackers = parseClickTrackingNodes(linearNode.getElementsByTagName("ClickTracking"));
		if (context.linearCreativeClicksTemp) {
			for (var r = 0; r < context.linearCreativeClicksTemp.length; r++) {
				trackerURL = null;
				trackerID = null;
				trackerURL = context.linearCreativeClicksTemp[r].url;
				trackerID = context.linearCreativeClicksTemp[r].id;
				clickTrackers.push(new webapis.adframework.ClickTracker(trackerID, trackerURL));
			}
		}
		
		//TODO: Support parsing icons
		//Support parsing icons
		var icons = [];
		var iconNodes = linearNode.getElementsByTagName("Icon");
		for (var ii = 0; ii < iconNodes.length; ii++) {
			icons.push(iconParser.iconNodeToIconObjects(iconNodes[ii]));
		}
		creativeObject = new webapis.adframework.LinearCreative({
				//General Creative stuff
				id: creativeID,
				sequence: creativeSequence,
				adID: creativeAdID,
				apiFramework: creativeAPIFramework,
				adParameters: adParameters,
				//Variables specific to Linears
				skipOffset: skipOffset,
				duration: duration,
				mediaFiles: mediaFiles,
				eventTrackers: eventTrackers,
				icons: icons,
				clickThrough: clickThrough,
				clickTrackers: clickTrackers
			});
		return creativeObject;
	};
	/**
	* @fn		parseNonlinearResource
	* @brief	Parse NonLinear Resource node. This function will return NonLinear Resources
	*
	* @param[in]/[out]	: variationNode
	*					: context
	* @return			: resources
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseNonlinearResource = function(variationNode, context) {
		var resources = [];
		var resourceNode = null;
		var creativeType = null;
		var resource = null;
		var n = null;
		var staticResourceNodes = variationNode.getElementsByTagName("StaticResource");
		var resourceValue = null;
		//staticResource has a creativeType attribute, image/gif, image/jpeg, image/png, application/x-javascript, application/x-shockwave-flash
		if (staticResourceNodes && staticResourceNodes.length) {
			for (n = 0; n < staticResourceNodes.length; n++) {
				resourceNode = staticResourceNodes[n];
				creativeType = resourceNode.getAttribute("creativeType");

				resourceValue = getSingleNodeValue(resourceNode);
				var inferredCreativeType = null;

				if (!creativeType) {
					sendVSuiteParseError(101, context, "No CreativeType provided for NonLinear StaticResource");
					continue;
				} else if (webapis.adframework.utils.isGIFMIME(creativeType) ||
					webapis.adframework.utils.isJPEGMIME(creativeType) ||
					webapis.adframework.utils.isPNGMIME(creativeType)) {
					inferredCreativeType = webapis.adframework.NonLinearResource.ResourceType.STATIC_IMAGE;
				} else if (webapis.adframework.utils.isJSMIME(creativeType)) {
					inferredCreativeType = webapis.adframework.NonLinearResource.ResourceType.STATIC_JS;
				} else if (webapis.adframework.utils.isFlashMIME(creativeType)) {
					inferredCreativeType = webapis.adframework.NonLinearResource.ResourceType.STATIC_FLASH;
				}
				else {
					;/*NULL*/
				}
				if (resourceValue && inferredCreativeType) {
					resource = new webapis.adframework.NonLinearResource({
						resource: resourceValue,
						type: inferredCreativeType
					});
					resources.push(resource);
				} else {
					sendVSuiteParseError(101, context, "Unable to parse Nonlinear ad StaticResource: missing resource(" + resourceValue + ") or creative type(" + inferredCreativeType + ")");
				}
			}
		}
		var iframeResourceNodes = variationNode.getElementsByTagName("IFrameResource");
		if (iframeResourceNodes) {
			for (n = 0; n < iframeResourceNodes.length; n++) {
				resourceNode = iframeResourceNodes[n];
				resourceValue = getSingleNodeValue(resourceNode);
				if (resourceValue) {
					resource = new webapis.adframework.NonLinearResource({
						resource: resourceValue,
						type: webapis.adframework.NonLinearResource.ResourceType.IFRAME
					});
					resources.push(resource);
				} else {
					sendVSuiteParseError(101, context, "Unable to parse Nonlinear ad: missing resource value inside IFrameResource");
				}
			}
		}
		var htmlResourceNodes = variationNode.getElementsByTagName("HTMLResource");
		if (htmlResourceNodes) {
			for (n = 0; n < htmlResourceNodes.length; n++) {
				resourceNode = htmlResourceNodes[n];
				resourceValue = getSingleNodeValue(resourceNode);
				if (resourceValue) {
					resource = new webapis.adframework.NonLinearResource({
						resource: resourceValue,
						type: webapis.adframework.NonLinearResource.ResourceType.HTML
					});
					resources.push(resource);
				} else {
					sendVSuiteParseError(101, context, "Unable to parse Nonlinear ad: missing resource value inside HTMLResource");
				}
			}
		}
		return resources;
	};
	//Parse a Nonlinear node. This function will return parseNonlinear instanceof CreativeNode
	/**
	* @fn		parseNonlinearNode
	* @brief	
	*
	* @param[in]/[out]	: nonLinearNode
	*					: context
						: creativeID
						: creativeSequence
	*					: creativeAdID
						: creativeAPIFramework
	* @return			: creativeObject
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseNonlinearNode = function(nonLinearNode, context, creativeID, creativeSequence, creativeAdID, creativeAPIFramework) {
		var creativeObject = null;
		var trackerNodes = nonLinearNode.getElementsByTagName("Tracking");
		var eventTrackers = parseTrackerNodes(trackerNodes);
		var trackerURL = null;
		var trackerID = null;
		if (context.nonLinearCreativeTrackerTemp) {
			for (var u = 0; u < context.nonLinearCreativeTrackerTemp.length; u++) {
				trackerURL = context.nonLinearCreativeTrackerTemp[u].url;
				trackerID = context.nonLinearCreativeTrackerTemp[u].id;
				if (creativeViewRegex.test(trackerID)) {
					eventTrackers.push(new webapis.adframework.OneTimeTracker(trackerID, trackerURL));
				} else {
					eventTrackers.push(new webapis.adframework.Tracker(trackerID, trackerURL));
				}
			}
		}

		var variations = [];

		//Parse NonLinear variations
		var nonLinearNodes = nonLinearNode.getElementsByTagName("NonLinear");
		for (var j = 0; j < nonLinearNodes.length; j++) {
			var variationNode = nonLinearNodes[j];
			var id = variationNode.getAttribute("id");
			var width = variationNode.getAttribute("width");
			var height = variationNode.getAttribute("height");
			var expandedWidth = variationNode.getAttribute("expandedWidth");
			var expandedHeight = variationNode.getAttribute("expandedHeight");
			var scalable = variationNode.getAttribute("scalable");
			var maintainAspectRatio = variationNode.getAttribute("maintainAspectRatio");
			var minSuggestedDuration = variationNode.getAttribute("minSuggestedDuration");
			var apiFramework = variationNode.getAttribute("apiFramework");

			var clickThrough = getSingleNodeValue(variationNode.getElementsByTagName("NonLinearClickThrough"));

			var clickTrackingNodes = variationNode.getElementsByTagName("NonLinearClickTracking");
			var clickTrackers = parseClickTrackingNodes(clickTrackingNodes);
			if (context.nonLinearCreativeClicksTemp) {
				for (var r = 0; r < context.nonLinearCreativeClicksTemp.length; r++) {
					trackerURL = context.nonLinearCreativeClicksTemp[r].url;
					trackerID = context.nonLinearCreativeClicksTemp[r].id;
					clickTrackers.push(new webapis.adframework.ClickTracker(trackerID, trackerURL));
				}
			}
			//Each NonLinearClickTracking has a "id", unfortunately we throw this info away

			var adParameters = getSingleNodeValue(variationNode.getElementsByTagName("AdParameters"));

			var resources = parseNonlinearResource(variationNode, context) ;
			if(!width || !height) {
				sendVSuiteParseError(101, context, "Unable to parse Nonlinear ad: missing width/height");
			}
			else if(!resources) {
				sendVSuiteParseError(101, context, "Unable to parse Nonlinear ad: no valid resources found");
			}
			else {
				var nonLinearVariation = new webapis.adframework.NonLinearVariation({
					id: id,
					width: width,
					height: height,
					expandedWidth: expandedWidth,
					expandedHeight: expandedHeight,
					scalable: scalable,
					maintainAspectRatio: maintainAspectRatio,
					minSuggestedDuration: minSuggestedDuration,
					apiFramework: apiFramework,
					clickThrough: clickThrough,
					clickTrackers: clickTrackers,
					adParameters: adParameters,
					resources: resources
				});
				variations.push(nonLinearVariation);
			}
		}

		if(!variations) {
			sendVSuiteParseError(101, context, "Unable to parse Nonlinear ad: no valid NonLinear nodes found");
		}
		else {
			creativeObject = new webapis.adframework.NonLinearCreative({
				//General Creative stuff
				id: creativeID,
				sequence: creativeSequence,
				adID: creativeAdID,
				apiFramework: creativeAPIFramework,
				eventTrackers: eventTrackers,
				//Variables specific to NonLinears
				variations: variations
			});
		}
		return creativeObject;
	};	
	//Parse a single <Creative> node. A creative may be Linear, Nonlinear, or Companion. This function will return any of those 3 (as an instanceof Creative)
	/**
	* @fn		parseCreativeNode
	* @brief	
	*
	* @param[in]/[out]	: creativeNode
	*					: context
	* @return			: var parseCreativeNode =
	* @warning			: None
	* @exception		: None
	* @see
	*/
var parseCreativeNode = function(creativeNode, context) {
		context = webapis.adframework.Parser.getNewContext(context);
		var creativeID = creativeNode.getAttribute("id");
		var creativeSequence = creativeNode.getAttribute("sequence");
		var creativeAdID = creativeNode.getAttribute("adID");
		var creativeAPIFramework = creativeNode.getAttribute("apiFramework");
		
		var linearNode = creativeNode.getElementsByTagName("Linear")[0]; //Assume 0 or 1 nodes (this may be incorrect - the spec is ambiguous)
		var nonLinearNode = creativeNode.getElementsByTagName("NonLinearAds")[0]; //Assume 0 or 1 nodes that contain multiple variations
		var companionNodes = creativeNode.getElementsByTagName("Companion"); //0 or more nodes
		
		var creativeObject = null;
		if(linearNode) {
			creativeObject = parseLinearNode(linearNode, context, creativeID, creativeSequence, creativeAdID, creativeAPIFramework);
			if(!creativeObject || creativeObject == null) {
				return null;
			}
		}
		if (nonLinearNode) {
			creativeObject = parseNonlinearNode(nonLinearNode, context, creativeID, creativeSequence, creativeAdID, creativeAPIFramework);
		}
		if (companionNodes.length > 0) {
			creativeObject = companionParser.companionNodesToCompanionCreative(creativeNode, companionNodes);
		}
		return creativeObject;
	};

	/**
	* @fn		getCompanionCreativeFromContext
	* @brief	
	*
	* @param[in]/[out]	: context
	* @return			: var getCompanionCreativeFromContext =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var getCompanionCreativeFromContext = function(context){
		var creatives = [];
		if (context.companionCreativeNode){
			for (var i = 0; i < context.companionCreativeNode.length; i++) {
				var creativeNodeString = context.companionCreativeNode[i].creativeNodeString,
					creativeNode = (new DOMParser()).parseFromString(creativeNodeString, "text/xml").firstChild,
					companionNodes = creativeNode.getElementsByTagName("Companion"); //0 or more nodes
					creatives.push(companionParser.companionNodesToCompanionCreative(creativeNode, companionNodes));
			}
		}
		return creatives;
	};
	
	//Parse a collection of Creative nodes
	/**
	* @fn		parseCreativeNodes
	* @brief	
	*
	* @param[in]/[out]	: creativeNodes
	*					: context
	* @return			: var parseCreativeNodes =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseCreativeNodes = function(creativeNodes, context) {
		context = webapis.adframework.Parser.getNewContext(context);
		var creatives = [];
		if (!creativeNodes || !creativeNodes.length) {
			return creatives;
		}
		for (var i = 0; i < creativeNodes.length; i++) {
			var creativeNode = creativeNodes[i];
			var creativeObject = parseCreativeNode(creativeNode, context);
			if (creativeObject) {
				creatives.push(creativeObject);
			}
		}
		var tempcreative = getCompanionCreativeFromContext(context);
		if (tempcreative){
			creatives = creatives.concat(tempcreative);
		}

		return creatives;
	};
	
		//Creates an webapis.adframework.Ad object that holds a list of creatives.
	/**
	* @fn		parseInLineAdElement
	* @brief	
	*
	* @param[in]/[out]	: adEle
	*					: context
	*					: sequence
	* @return			: var parseInLineAdElement =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseInLineAdElement = function(adEle, context, sequence) {
		try {
			context = webapis.adframework.Parser.getNewContext(context); //Copy the params map so that it does not pollute the previous function's params
			var adSystem = getSingleNodeValue(adEle.getElementsByTagName("AdSystem"));
			var errorTrackers = parseErrorNodes(adEle.getElementsByTagName("Error"), context);
			if (context.errorURLs) {
				errorTrackers = errorTrackers.concat(parseErrorNodes(context.errorURLs));
			}
			var impressionTrackers = parseImpressionNodes(adEle.getElementsByTagName("Impression"), context);
			if (context.impressionURLs) {
				impressionTrackers = impressionTrackers.concat(parseImpressionNodes(context.impressionURLs));
			}
			if(!impressionTrackers || !impressionTrackers.length) {
				webapis.adframework.Parser.sendVSuiteParseError(101, context, "Failed to parse Ad: Ad's Impression node is missing");
				return null;
			}
		
			var adTitle = getSingleNodeValue(adEle.getElementsByTagName("AdTitle"));
			var adDescription = getSingleNodeValue(adEle.getElementsByTagName("Description"));
			var advertiser = getSingleNodeValue(adEle.getElementsByTagName("Advertiser"));
			var pricing = getSingleNodeValue(adEle.getElementsByTagName("Pricing"));
			var survey = getSingleNodeValue(adEle.getElementsByTagName("Survey"));
		
			try {
				var creativesNode = adEle.getElementsByTagName("Creatives")[0];
				var creatives = parseCreativeNodes(creativesNode.getElementsByTagName("Creative"), context);
				if (!creatives || !creatives.length) {
					webapis.adframework.Parser.sendVSuiteParseError(101, context, "Failed to parse Ad: InLine Ad Element has no valid creatives");
					return null;
				}
				else {
					return new webapis.adframework.Ad({
						impressionTrackers : impressionTrackers,
						errorTrackers : errorTrackers,
						creatives : creatives,
						adSystem: adSystem,
						adTitle: adTitle,
						advertiser: advertiser,
						sequence: sequence,
						originalSequence: sequence,
						description: adDescription,
						pricing: pricing,
						survey: survey
					});
				}
			}
			catch(e) {
				webapis.adframework.Parser.sendVSuiteParseError(101, context, "Failed to parse Ad: InLine Ad Element has no valid creatives: " + e);
			}
			
		} 
		catch (e) {
			; /*NULL*/
		}
	};	
	
	var parseVAST;
	//Parse a VAST Wrapper URL asynchronously
	/**
	* @fn		parseWrapperAdElementAsync
	* @brief	
	*
	* @param[in]/[out]	: wrapperURL
	*					: myPromise
	*					: context
	* @return			: var parseWrapperAdElementAsync =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseWrapperAdElementAsync = function(wrapperURL, myPromise, context) {
		log("Wrapper URL : "+wrapperURL);
		context = webapis.adframework.Parser.getNewContext(context);
		context.depth++;
		var errorMessage = "";
		var ajaxPromise = new webapis.adframework.Promise();
		ajaxPromise.onSuccess(function(xhr) {
			if (xhr && xhr.responseXML) {
				if (isVAST(xhr.responseXML)) {
					if(xhr.responseXML.getElementsByTagName("Ad").length > 0) {
						parseVAST(xhr.responseXML, myPromise, context);
					}
					else {
						var errorCode = 303;
						errorMessage = webapis.adframework.Errors[errorCode];
						webapis.adframework.Parser.sendVSuiteParseError(errorCode, context, errorMessage);
						myPromise.reportFailure(errorMessage);
					}
				} else {
					errorMessage = "Retrieved wrapper URL is not a valid VAST document";
					webapis.adframework.Parser.sendVSuiteParseError(101, context, errorMessage);
					myPromise.reportFailure(errorMessage);
				}
			} else {
				errorMessage = "Wrapper AJAX request returned no data";
				webapis.adframework.Parser.sendVSuiteParseError(300, context, errorMessage);
				myPromise.reportFailure(errorMessage);
			}
		}).onFailure(function(result) {
			var errorCode = 301;
			errorMessage = webapis.adframework.Errors[errorCode];
			webapis.adframework.Parser.sendVSuiteParseError(errorCode, context, errorMessage);
			myPromise.reportFailure(errorMessage + " : " + result);
		}).setTimeout(getRetrievalTimeRemaining(context));
		webapis.adframework.utils.ajax(wrapperURL, ajaxPromise);
	};
	
	/**
	* @fn		parseWrapperAdElement
	* @brief	
	*
	* @param[in]/[out]	: adEle
	*					: context
	* @return			: var parseWrapperAdElement =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var parseWrapperAdElement = function(adEle, context) {
	
		var wrapperContext = webapis.adframework.Parser.getNewContext(context);
			
			var creativeNodes = adEle.getElementsByTagName("Creative");
			for (var y = 0; y < creativeNodes.length; y++) {
				var creativeNode = creativeNodes[y];
				var linearNode = creativeNode.getElementsByTagName("Linear")[0]; //Assume 0 or 1 nodes (this may be incorrect - the spec is ambiguous)
				var nonLinearNode = creativeNode.getElementsByTagName("NonLinearAds")[0]; //Assume 0 or 1 nodes (this may be incorrect - the spec is ambiguous)
				var companionNodes = creativeNode.getElementsByTagName("Companion"); //0 or more nodes
				var currentTrackingNode;
				if (linearNode) {
					var trackingNodes = linearNode.getElementsByTagName("Tracking");
					for (var x = 0; x < trackingNodes.length; x++) {
						currentTrackingNode = trackingNodes[x];
						var tempMapTrackingNode = {
							url: getSingleNodeValue(currentTrackingNode),
							id: currentTrackingNode.getAttribute("event"),
							offset: currentTrackingNode.getAttribute("offset")
						};
						wrapperContext.linearCreativeTrackerTemp.push(tempMapTrackingNode);
					}

					var clicksNodes = linearNode.getElementsByTagName("ClickTracking");
					for (var index = 0; index < clicksNodes.length; index++) {
						currentTrackingNode = clicksNodes[index];
						var tempMapClickNodes = {
							url: getSingleNodeValue(currentTrackingNode),
							id: currentTrackingNode.getAttribute("id")
						};
						wrapperContext.linearCreativeClicksTemp.push(tempMapClickNodes);
					}
				}
				
				if (nonLinearNode) {
					var nTrackingNodes = nonLinearNode.getElementsByTagName("Tracking");
					for (var j = 0; j < nTrackingNodes.length; j++) {
						currentTrackingNode = nTrackingNodes[j];
						var tempMapNTrackNode = {
							url: getSingleNodeValue(currentTrackingNode),
							id: currentTrackingNode.getAttribute("event"),
							offset: currentTrackingNode.getAttribute("offset")
						};
						wrapperContext.nonLinearCreativeTrackerTemp.push(tempMapNTrackNode);
					}

					var nClicksNodes = nonLinearNode.getElementsByTagName("NonLinearClickTracking");
					for (var k = 0; k < nClicksNodes.length; k++) {
						currentTrackingNode = nClicksNodes[k];
						var tempMapNClickNode = {
							url: getSingleNodeValue(currentTrackingNode),
							id: currentTrackingNode.getAttribute("id")
						};
						wrapperContext.nonLinearCreativeClicksTemp.push(tempMapNClickNode);
					}
				}
						if (companionNodes.length > 0) {
							//Saving creativeNode into Context
							//XMLNode To String
							var creativeNodeString = (new XMLSerializer()).serializeToString(creativeNode);
							var tempMapCompanion = {
								creativeNodeString: creativeNodeString,
								depth: context.depth
							};
							wrapperContext.companionCreativeNode.push(tempMapCompanion);
				}
			}
			
			//I am not sure if the <Wrapper> <Error> URLs should be called during parsing errors - doing it anyway. Comment this line out to stop.
			wrapperContext.adParseErrorURLs = wrapperContext.adParseErrorURLs.concat(getMultipleNodeValues(adEle.getElementsByTagName("Error")));
			wrapperContext.errorURLs = wrapperContext.errorURLs.concat(getMultipleNodeValues(adEle.getElementsByTagName("Error")));
			wrapperContext.impressionURLs = wrapperContext.impressionURLs.concat(getMultipleNodeValues(adEle.getElementsByTagName("Impression")));
			var followAdditionalWrappers = adEle.getAttribute("followAdditionalWrappers");
			followAdditionalWrappers = followAdditionalWrappers ? webapis.adframework.utils.parseBoolean(followAdditionalWrappers) : true;
			wrapperContext.followAdditionalWrappers = followAdditionalWrappers && wrapperContext.followAdditionalWrappers;

			var allowMultipleAds = adEle.getAttribute("allowMultipleAds");
			allowMultipleAds = (typeof allowMultipleAds === "string") ? webapis.adframework.utils.parseBoolean(allowMultipleAds) : true;
			wrapperContext.allowMultipleAds = allowMultipleAds && wrapperContext.allowMultipleAds;
			var fallbackOnNoAd = adEle.getAttribute("fallbackOnNoAd");
			wrapperContext.fallbackOnNoAd = fallbackOnNoAd ? webapis.adframework.utils.parseBoolean(fallbackOnNoAd) : false;

		return wrapperContext;
	};
	
	//Parse VAST - Main function (delegates to other functions)
	/**
	* @fn		loadAdsFromVAST
	* @brief	
	*
	* @param[in]/[out]	: vastNode
	*					: myPromise
	*					: context
	* @return			: var loadAdsFromVAST =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var loadAdsFromVAST = function(vastNode, myPromise, context) {
		context = webapis.adframework.Parser.getNewContext(context);
		var wrapperURL = null;
		var tempAd = null;
		var adList = [];
		if(!vastNode) {
			return adList;
		}
		var xmlDocument = vastNode;
		
		
		if(!(vastNode instanceof Document)) { 
			xmlDocument = vastNode.ownerDocument;
		}
		
		//TODO: Fire the error if necessary
		//Assuming vastNode has been parsed into a valid XML document...
		var adElements = vastNode.getElementsByTagName("Ad");

		var delegatedPromiseList = new webapis.adframework.PromiseList();

		for (var a = 0, al = adElements.length; a < al; ++a) {
			var adEle = adElements[a];
			var adID = adEle.getAttribute("id");
			var adSequence = adEle.getAttribute("sequence");
			try { 
				adSequence = parseInt(adSequence,10); 
			} 
			catch(e) { 
				adSequence = null; 
			}
			if (+adSequence !== adSequence) { //isNaN
                adSequence = null;
            }
			var inline = adEle.getElementsByTagName("InLine")[0];
			var wrapper = adEle.getElementsByTagName("Wrapper")[0];
		
			var adObj = null;
			tempAd = null;
			if(inline) { 
				try {
					tempAd = parseInLineAdElement(inline, context, adSequence);
					if(tempAd) {
						adObj = {
							id: adID,
							type: "inline",
							status: "fulfilled",
							ads: [tempAd],
							depth: context.depth,
							sequence: adSequence
						};
						adList.push(adObj);
					}
				}
				catch (e) {
					webapis.adframework.Parser.sendVSuiteParseError(100, context, "Exception while parsing InLine ad element: " + e);
				}
			}
			else if(wrapper) {
				wrapperURL = getSingleNodeValue(wrapper.getElementsByTagName("VASTAdTagURI"));
				if(!wrapperURL || !wrapperURL.trim()) {
					webapis.adframework.Parser.sendVSuiteParseError(101, context, "Failed to parse Wrapper ad element: Missing VastAdTagURI");
					return;
				}
				
				var msg = "";
				//Check if we're allowed to parse the wrapper. Then go get it.
				if ((context.depth + 1) > webapis.adframework.config.get("MAX_VAST_WRAPPER_DEPTH")) {
					msg = "maximum wrapper depth reached: " + context.depth;
					webapis.adframework.Parser.sendVSuiteParseError(302, context, msg);
				} 
				else if (context.followRedirects === false) {
					msg = "followRedirects is disabled";
					log(msg);
				} 
				else if (context.followAdditionalWrappers === false) {
					msg = "followAdditionalWrappers is disabled";
					log(msg);
				} 
				else{
				adObj = parseWrapperAdElement(wrapper, context);
			
				//Parse the wrapper
				(function() {
					var promisedAds = {
						id: adID,
						type: "wrapper",
						status: "promised " + a,
						depth: adObj.depth,
						sequence: adSequence,
						ads: []
					};
					adList.push(promisedAds);
		
					var delegatedPromise = new webapis.adframework.Promise();
					delegatedPromise.onSuccess(function(list) {
						promisedAds.status = "fulfilled";
						promisedAds.ads = list;

						//Check if allowMultipleAds is on

						if (adObj.allowMultipleAds === false && list && list.length > 0) {
							var singleAd = list[0];
							for (var n = 0; n < list.length; n++) {
								if (!list[n].sequence) {
									singleAd = list[n];
								}
							}
							promisedAds.ads = [singleAd];
						}
					})
					.onFailure(function() {
						promisedAds.status = "broken";

						if (adObj.fallbackOnNoAd === true) {
							try {
								//Yank out one of the inLine NONSEQUENCED ads and stick it where the fallback should be.
								for (var f = 0; f < adList.length; f++) {
									var adHolder = adList[f];
									if (adHolder.type === "inline" && adHolder.ads && !adHolder.sequence) {
										promisedAds.ads = adHolder.ads;
										promisedAds.ads[0].sequence = promisedAds.sequence;
										promisedAds.status = "fallback";
										adList.splice(f, 1);
										log(promisedAds.id + " broken; replacing with " + adHolder.id);
										break;
									}
								}
								console.dir(promisedAds);
							} catch (e) {
								error("FALLBACKONNOAD error: " + e);
							}
						}
					}).setTimeout(getRetrievalTimeRemaining(adObj));
					
					delegatedPromiseList.add(delegatedPromise);
					parseWrapperAdElementAsync(wrapperURL, delegatedPromise, adObj);
				}());
			}
			}
			else {
				var errorMessage = "Ad has no InLine or Wrapper tags! " + adID;
				webapis.adframework.Parser.sendVSuiteParseError(101, context, errorMessage);
			}
		}
		
		delegatedPromiseList.onComplete(function() {
		adList.sort(function(a, b) {
				var ret = 0;
                var a_sequence = parseInt(a.sequence, 10),
                    b_sequence = parseInt(b.sequence, 10);

                if (a_sequence > b_sequence) {
                    ret = 1;
                } else if (a_sequence < b_sequence) {
                    ret = -1;
                } else if ((+a_sequence !== a_sequence) && (+b_sequence === b_sequence)) { 
                        ret = 1;
                } else if ((+b_sequence !== b_sequence) && (+a_sequence === a_sequence)) {    
                        ret = -1;
                }
				else {
					;/*NULL*/
				}
                return ret;
			});
			
			var mergedAds = deepMerge(adList);
			if (!mergedAds.length) {
                log("Empty or problematic VAST");
            }
			myPromise.reportSuccess(mergedAds);
		}).start();
	};

	//Parses a VAST url. 
	//Returns either [webapis.adframework.Ad]
	/**
	* @fn		parseVAST
	* @brief	
	*
	* @param[in]/[out]	: xml
	*					: myPromise
	*					: context
	* @return			: parseVAST =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	parseVAST = function(xml, myPromise, context) {
		context = webapis.adframework.Parser.getNewContext(context);
		if(!xml || !xml.documentElement || !xml.documentElement.tagName) { 
			return;
		}
		var rootName = xml.documentElement.tagName.toLowerCase();
		if(rootName.indexOf("vast") < 0){ 
			return; 
		}

		var vastPromise = new webapis.adframework.Promise();
		vastPromise.onSuccess(function(returnedAds) {
			myPromise.reportSuccess(returnedAds);
		}).onFailure(function() {
			webapis.adframework.Parser.sendVSuiteParseError(1006, context, "Failed to retrieve VAST AdSource");
			myPromise.reportSuccess(null);
		}).setTimeout(webapis.adframework.config.get("AD_RETRIEVAL_TIMEOUT") + 100);
		
		loadAdsFromVAST(xml, vastPromise, context);
	};
	//by amit tyagi stop
	return {
		parseVAST: parseVAST,
		loadAdsFromVAST: loadAdsFromVAST
	};
}());

if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}

/**
 * @brief VMAPParser Model.
 * @details A BluePrint of VMAPParser Model
 * @return Null
 */
webapis.adframework.VMAPParser = (function() {
	
	"use strict";
	
	//Magical XML node value getter for the lazy - gets you the textContent of the first node in a list of nodes (or single node) that you provide. Good if you know you've only got one node to care about.
	/**
	* @fn		getSingleNodeValue
	* @brief	
	*
	* @param[in]/[out]	: xmlNodes
	* @return			: var getSingleNodeValue =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var getSingleNodeValue = function(xmlNodes) {
		var val = null;
		if (typeof xmlNodes === "string") {
			return xmlNodes;
		}
		if (xmlNodes && (xmlNodes instanceof NodeList || xmlNodes instanceof HTMLCollection) && xmlNodes[0]) {
			val = xmlNodes[0].textContent.trim();
		} else if (xmlNodes instanceof Node || xmlNodes instanceof Element) {
			if(xmlNodes && xmlNodes.childNodes && xmlNodes.childNodes[0] && xmlNodes.childNodes[0].textContent.trim()) {
				val = xmlNodes.childNodes[0].textContent.trim();
			} else if (xmlNodes && xmlNodes.textContent.trim()) {
				val = xmlNodes.textContent.trim();
			}
			else {
				;/* NULL */
			}
		}
		else {
			;/* NULL */
        }
		return val;
	};
	

	//Given a node as the first parameter, return a NodeList of elements matching the given tagName. Will only find nodes with the VMAP namespace.
    var getVMAPNode = function(givenNode, tagName) {
        var temp = givenNode.getElementsByTagNameNS("http://www.iab.net/videosuite/vmap", tagName);
        if (!temp || !temp.length) {
            //Tries to use an alternative NS (a muckup in the IAB's VMAP 1.0 spec caused confusion)
            temp = givenNode.getElementsByTagNameNS("http://www.iab.net/vmap-1.0", tagName);
        }
        return temp;
    };
	
    //Parses a VMAP AdSource node (either inline VAST XML or a redirect to it). The promise that this function is given will be fulfilled with a list of ads.
    var parseVMAPAdSourceNodeAsync = function(adSourceNode, vastPromise, context) {

        var templateType;

        //2 methods to grab the VASTData because of an error (inconsistency) in the way the VAST data is supposed to be delivered.
        var vastAdData = getVMAPNode(adSourceNode, "VASTData")[0];
        if (!vastAdData) {
            vastAdData = getVMAPNode(adSourceNode, "VASTAdData")[0];
        }

        //If the Ad Source is VAST 3.0 (our favorite)
        if (vastAdData && adSourceNode.getElementsByTagNameNS("*", "VAST")[0]) {
            var vastNode = vastAdData.getElementsByTagNameNS("*", "VAST")[0];
			webapis.adframework.VastParser.loadAdsFromVAST(vastNode, vastPromise, context);        
        }

        /*
         * If the Ad Source is a redirect URL...
         * First we need to check if the document will be VAST3 or VAST2. If it isn't it's not supported anyway, so don't grab the redirect.
         * If it's a supported document type, grab it and parse its ads.
         * */
        else if (getVMAPNode(adSourceNode, "AdTagURI")) {
            var redirectNode = getVMAPNode(adSourceNode, "AdTagURI")[0];
            var redirectURL = getSingleNodeValue(redirectNode);
            templateType = redirectNode.getAttribute("templateType");
            if (templateType && (templateType.toLowerCase().trim() === "vast2" || templateType.toLowerCase().trim() === "vast3")) {
                webapis.adframework.Parser.parse(redirectURL, vastPromise, context);
            } else {
                var errorMessage = "Unsupported ad templateType: " + templateType;
                sendVSuiteParseError(1005, context, errorMessage);
                vastPromise.reportFailure(errorMessage);
            }
        }

        /*
         * If the Ad Source is CustomAdData
         * First we need to check if the CustomAdData will be VAST2. If it isn't it's not supported, so we don't parse it.
         * If it's VAST2, we take the CDATA string and make it into a VAST2 XML, and load ads from it.
         * */
        else if (getVMAPNode(adSourceNode, "CustomAdData")) {
            var customAdDataNode = getVMAPNode(adSourceNode, "CustomAdData")[0];
            templateType = customAdDataNode.getAttribute("templateType");
            if (templateType && templateType.toLowerCase().trim() === "vast2") {
                var cdataString = getSingleNodeValue(customAdDataNode);
                webapis.adframework.VastParser.parseVAST(new DOMParser().parseFromString(cdataString, "text/xml"), vastPromise, context);
            } else {
                var errorMsg = "Unsupported ad templateType: " + templateType;
                sendVSuiteParseError(1005, context, errorMsg);
                vastPromise.reportFailure(errorMsg);
            }
        } else {
            vastPromise.reportFailure("No valid AdSource detected from VMAP AdBreak");
        }
    };
	
	//Parse a VMAP AdBreak node asynchronously
    var parseVMAPAdBreakNodeAsync = function(adBreakNode, myPromise, context) {
        
        context = webapis.adframework.Parser.getNewContext(context);

        var allowMultipleAds = true; //Gets changed later
        var followRedirects = true; //Gets changed later
        var offset = adBreakNode.getAttribute("timeOffset");
        var breakType = adBreakNode.getAttribute("breakType");
        var breakID = adBreakNode.getAttribute("breakId");

        //Parse AdBreak TrackingEvents
        var eventTrackerList = [];
        var errorTrackerList = [];
        var trackingNodes = getVMAPNode(adBreakNode, "Tracking");
        if (trackingNodes && trackingNodes.length > 0) {
            for (var j = 0, len = trackingNodes.length; j < len; j++) {
                var trackingNode = trackingNodes[j];
                var event = trackingNode.getAttribute("event");
                var url = getSingleNodeValue(trackingNode);
                if (event && url) {
                    if (event.toLowerCase().trim() === "error") {
                        errorTrackerList.push(new webapis.adframework.ErrorTracker(url));
                        context.adParseErrorURLs.push(url);
                    } else {
                        eventTrackerList.push(new webapis.adframework.OneTimeTracker(event, url));
                    }
                }
            }
        } else {
				;/* NULL */
        }

        //Logic for repeating ad breaks (basically save a copy of the XML and parsing context so we can dupe this adbreak)
        var repeatAfter = adBreakNode.getAttribute("repeatAfter");
        var repeatAfterMS = null;
        var stringifiedAdBreakNode = null;
        var parsingContext = null;
        if(typeof repeatAfter === "string") {
            repeatAfterMS = webapis.adframework.utils.getTimeInt(repeatAfter);
        }
        if(repeatAfterMS && adBreakNode) {
            //Save a stringified version of ad source node
            stringifiedAdBreakNode = new XMLSerializer().serializeToString(adBreakNode);
            parsingContext = webapis.adframework.Parser.getNewContext(context);
        }

        //Parse AdBreak AdSource (the thing that holds all of the ads)
        var adSourceID = null;
        var ads = null;
        var adSourceNode = null;

        var adSourceNodes = getVMAPNode(adBreakNode, "AdSource");
        if (adSourceNodes && adSourceNodes.length > 0) {
            adSourceNode = adSourceNodes[0];
        }

        var extensions = {
            global: context.globalVMAPExtensions,
            local: []
        };
        var extensionNodes = getVMAPNode(adBreakNode, "Extension");
        if(extensionNodes && extensionNodes.length) {
            for(var extensionIndex = 0; extensionIndex < extensionNodes.length; extensionIndex++) {
                extensions.local.push((new XMLSerializer()).serializeToString(extensionNodes[extensionIndex]));
            }
        }        

        var vastPromise = new webapis.adframework.Promise();
        vastPromise.onSuccess(function(returnedAds) {
            ads = returnedAds;
			
            var adBreak = new webapis.adframework.BreakInfo({
                offset: offset,//offsetParams,
                breakType: breakType,
                breakID: breakID,
                eventTrackers: eventTrackerList,
                errorTrackers: errorTrackerList,
                ads: ads,
                adSourceID: adSourceID,
                allowMultipleAds: allowMultipleAds,
                followRedirects: followRedirects,
                extensions: extensions,
                repeatAfter: repeatAfterMS,
                adBreakXMLString: stringifiedAdBreakNode,
                parsingContext: parsingContext
            });
            myPromise.reportSuccess(adBreak);
        }).onFailure(function() {
            ads = null;
            webapis.adframework.Parser.sendVSuiteParseError(1006, context, "Failed to retrieve VAST AdSource");
            if (eventTrackerList || (extensions.global || extensions.local)) {
                var adBreak = new webapis.adframework.BreakInfo({
                    offset: offset,
                    breakType: breakType,
                    breakID: breakID,
                    eventTrackers: eventTrackerList,
                    errorTrackers: errorTrackerList,
                    ads: [],
                    adSourceID: adSourceID,
                    allowMultipleAds: allowMultipleAds,
                    followRedirects: followRedirects,
                    extensions: extensions,
                    repeatAfter: repeatAfterMS,
                    adBreakXMLString: stringifiedAdBreakNode,
                    parsingContext: parsingContext
                });
                myPromise.reportSuccess(adBreak);
            } else {
                myPromise.reportFailure();
            }
        }).setTimeout(webapis.adframework.config.get("AD_RETRIEVAL_TIMEOUT") + 100);

        if (adSourceNode) {

            adSourceID = adSourceNode.getAttribute("id");

            allowMultipleAds = adSourceNode.getAttribute("allowMultipleAds") || allowMultipleAds;
            followRedirects = adSourceNode.getAttribute("followRedirects") || followRedirects;
            context.allowMultipleAds = webapis.adframework.utils.parseBoolean(allowMultipleAds);
            context.followRedirects = webapis.adframework.utils.parseBoolean(followRedirects);

            //Finish parsing the ad source node
            parseVMAPAdSourceNodeAsync(adSourceNode, vastPromise, context);
            
        } else {
            vastPromise.reportFailure("No AdSource node detected from VMAP AdBreak");
        }
    };
	
	//Parse a VMAP XmlDocument asynchronously
    var parseVMAP = function(xmlDocument, myPromise) {

        var context = webapis.adframework.Parser.getNewContext();

        if(xmlDocument.documentElement) {
            xmlDocument = xmlDocument.documentElement;
        }

        var adBreakNodes = getVMAPNode(xmlDocument, "AdBreak");

        var adBreaks = []; //A list of AdBreak objects

        //Any global extensions?
        for (var nodePosition = 0; nodePosition < xmlDocument.childNodes.length; nodePosition++) {
            var childNode = xmlDocument.childNodes[nodePosition];
            if (childNode.tagName && childNode.tagName.toLowerCase().indexOf("extensions") >= 0 && 
				getVMAPNode(childNode, "Extension")) {
                var globalExtensionNodes = getVMAPNode(childNode, "Extension");
                for(var globalExtensionIndex = 0; globalExtensionIndex < globalExtensionNodes.length; globalExtensionIndex++) {
                   context.globalVMAPExtensions.push((new XMLSerializer()).serializeToString(globalExtensionNodes[globalExtensionIndex]));
                
                }
                break;
            }
        }

        //I promise to send a list of adbreaks when I'm done
        var promiseList = new webapis.adframework.PromiseList();
        promiseList.onComplete(function() {
            if (!adBreaks.length) {
                log("Empty or problematic VMAP");
            }
            myPromise.reportSuccess(adBreaks);
        });

        //For each adBreak in the XML...
        for (var i = 0; i < adBreakNodes.length; i++) {
            var adbreakPromise = new webapis.adframework.Promise();
            adbreakPromise.onSuccess(function(adbreak) {
                adBreaks.push(adbreak);
            });
            promiseList.add(adbreakPromise);
            parseVMAPAdBreakNodeAsync(adBreakNodes[i], adbreakPromise, context);
        }
        promiseList.start();
    };
	
	
	return {
		parseVMAP: parseVMAP,
		parseVMAPAdBreakNodeAsync: parseVMAPAdBreakNodeAsync
	};
	
}());

/*
 * webapis.adframework.PluginManager
 * Author: Kamlesh Rathi
 * Allows creation and management of Orsay Smart TV plugins.
 */
if(typeof window.webapis.adframework !== "object") { window.webapis.adframework = {}; }
webapis.adframework.PluginManager = (function(){
	"use strict";
	
	var Obj = function() {
		this._sefPlayers = [];
		this._audioPlugins = [];
	};
	
	//Create a SEF Plugin and return its ID
	Obj.prototype.generateSEFPlayer = function(id) {
		if(!id) {
			id = this.generateUniqueID("sefPlugin");
		}
		else if(document.getElementById(id)) {
			return null;
		}
		else {
				;/*NULL*/
		}
		var container = document.createElement("div");
		document.body.appendChild(container);

		container.innerHTML += this.generatePluginHTML(id, "SAMSUNG-INFOLINK-SEF");
		var sefPlayer = document.getElementById(id);
		if(sefPlayer) {
			this._sefPlayers.push(id);
			return sefPlayer;
		}
		else {
			return null;
		}
	};
	
	//Create an Audio plugin and return its ID
	Obj.prototype.generateAudioPlugin = function(id) {
		if(!id) {
			id = this.generateUniqueID("sefAudio");
		}
		else if(document.getElementById(id)) {
			return null;
		}
		else {
				;/*NULL*/
		}
		var container = document.createElement("div");
		document.body.appendChild(container);
		container.innerHTML += this.generatePluginHTML(id, "SAMSUNG-INFOLINK-AUDIO");
		var audio = document.getElementById(id);
		if(audio) {
			this._audioPlugins.push(id);
			return audio;
		}
		else {
			return null;
		}
	};
	
	//Given an ID and a clsid, creates the HTML necessary for a Orsay plugin.
	Obj.prototype.generatePluginHTML = function(id, clsid) {
		var style = "position:fixed; top:0px; left:0px; width:0px; height:0px; z-index:-99; display: inline-block;";
		if(clsid === "SAMSUNG-INFOLINK-SEF" || clsid === "SAMSUNG-INFOLINK-PLAYER") {
			style = "position:fixed; top:0px; left:0px; width:0px; height:0px; z-index:-99; display: inline-block;";
		}
		var html = "<OBJECT id='" + id + "' classid='clsid:" + clsid + "' style='" + "" + "'></OBJECT>";
		return html;
	};
	
	//Given a seed, generate a random ID that is unique to the current page.
	Obj.prototype.generateUniqueID = function(seed) {
		if(!seed) { seed = "plugin"; }
		var id = null;
		var rand = null;
		var existingElement = null;
		do {
			rand = Math.floor(Math.random()*99999);
			id = (seed + rand);
			existingElement = document.getElementById(id);
		} while(existingElement);
		return id;
	};
	
	return new Obj();
}());

/*
 * webapis.adframework.PlayerAdapter and webapis.adframework.TizenAdapter
 * Author: jasmine
 * Version: 0.9a 2014-03-06
 * Provides a wrapper class that can manipulate the Tizen player. Also provides prebuffering logic, and a multi-listener event model.
 */
if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}

var scaleArea = {
		WIDTH : 1920,
		HEIGHT : 910
};

/**
 * @brief PlayerAdapter Model.
 * @details A BluePrint of PlayerAdapter Model
 * @return Null
 */
webapis.adframework.PlayerAdapter = (function(){
	"use strict";
	//Constructor: set up prototype chain
	//DO NOT OVERRIDE THIS OR IT WILL NOT INHERIT EVENT FUNCTIONALITY!
	var Obj = function() {
		webapis.adframework.GenericEventDispatcher.call(this); //This object is an event dispatcher!
		this._state = Obj.State.STOPPED;
	};
	Obj.prototype = Object.create(webapis.adframework.GenericEventDispatcher.prototype);
	Obj.prototype.constructor = Obj;
	
	//A function that just throws an error. This allows creation of abstract functions that MUST be overrided.
	var abstractFunction = function() { 
		throw "abstract function, please implement"; 
	};
	
	//Abstract functions that should be implemented by each concrete implementation.
	
	Obj.prototype.initialize = abstractFunction; //do whatever your video player needs
	Obj.prototype.play = abstractFunction; //plays a video given a URL. if given signed milliseconds as a second parameter, starts playback that many milliseconds into the video
	Obj.prototype.initPlayer = abstractFunction; //prepares a video URL. Used instead of play() if you want to set some parameters on the adapter first.
	Obj.prototype.startPlayback = abstractFunction; //starts playback of initialized URL
	Obj.prototype.stop = abstractFunction; //stops and unloads the current video
	Obj.prototype.pause = abstractFunction; //pauses the currently playing video
	Obj.prototype.resume = abstractFunction; //resumes the currently paused video
	Obj.prototype.jump = abstractFunction; //jumps forward/backward in time, given unsigned milliseconds
	Obj.prototype.jumpForward = abstractFunction; //jumps forward in time, given signed milliseconds
	Obj.prototype.jumpBackward = abstractFunction; //jumps backward in time, given signed milliseconds
	
	Obj.prototype.startBufferingVideo = abstractFunction; //starts buffering a given URL, returns null
	Obj.prototype.playBufferedVideo = abstractFunction; //starts playback of buffered URL
	Obj.prototype.cancelBufferedVideo = abstractFunction; //destroys any buffered video on the dormant player
	Obj.prototype.getBufferedVideoURL = abstractFunction;
	
	Obj.prototype.getDuration = abstractFunction; //returns Integer in milliseconds
	Obj.prototype.getPlayhead = abstractFunction; //returns Integer in milliseconds
	
	Obj.prototype.getDisplayArea = abstractFunction; //gets an Object {x,y,w,h} relative to 960x540
	Obj.prototype.getCorrectedDisplayArea = abstractFunction; //gets an Object {x,y,w,h} in your native window size
	Obj.prototype.setDisplayArea = abstractFunction; // in pixels or units, relative to 960x540
	Obj.prototype.setCorrectedDisplayArea = abstractFunction; // in your native window size
	
	Obj.prototype.close = abstractFunction;
	Obj.prototype.getInternalPlayer = abstractFunction;
	
	Obj.State = {
		STOPPED: "STOPPED",	
		PLAYING: "PLAYING",	
		PAUSED: "PAUSED"
	};
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj.State);
	}
	
	Obj.DisplayArea = {
		LeftVideoArea: "LeftVideoArea",
		RightVideoArea: "RightVideoArea",
		LowerVideoArea: "LowerVideoArea",
		UpperVideoArea: "UpperVideoArea",
		NONE: "NONE"
	};
	
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj.DisplayArea);
	}
	
	/**
	* @fn		scaleTo960
	* @brief	
	*
	* @param[in]/[out]	: params
	* @return			: Obj.prototype.scaleTo960 =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.scaleTo960 = function(params) {
		if(!this.xScale) {
			this.xScale = window.innerWidth/scaleArea.WIDTH;
			this.yScale = window.innerHeight/scaleArea.HEIGHT;
		}

		params.x = Math.floor(params.x / this.xScale);
		params.w = Math.floor(params.w / this.xScale);
		
		params.y = Math.floor(params.y / this.yScale);
		params.h = Math.floor(params.h / this.yScale);
		
		return params;
	};
	
	/**
	* @fn		scaleFrom960
	* @brief	
	*
	* @param[in]/[out]	: params
	* @return			: Obj.prototype.scaleFrom960 =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.scaleFrom960 = function(params) {
		if(!this.xScale) {
			this.xScale = window.innerWidth/scaleArea.WIDTH;
			this.yScale = window.innerHeight/scaleArea.HEIGHT;
		}
		
		params.x = Math.floor(params.x * this.xScale);
		params.w = Math.floor(params.w *this.xScale);
		
		params.y = Math.floor(params.y *this.yScale);
		params.h = Math.floor(params.h *this.yScale);
		
		return params;
	};
	

	
	Obj.events = {
		CONNECTION_FAILED : "CONNECTION_FAILED",
		AUTHENTICATION_FAILED : "AUTHENTICATION_FAILED",
		STREAM_NOT_FOUND : "STREAM_NOT_FOUND",
		NETWORK_DISCONNECTED : "NETWORK_DISCONNECTED",
		NETWORK_SLOW: "NETWORK_SLOW",
		RENDER_ERROR : "RENDER_ERROR", 
		RENDERING_START: "RENDERING_START",
		RENDERING_COMPLETE : "RENDERING_COMPLETE",
		STREAM_INFO_READY : "STREAM_INFO_READY",
		BUFFERING_START : "BUFFERING_START",
		BUFFERING_PROGRESS : "BUFFERING_PROGRESS",
		BUFFERING_COMPLETE : "BUFFERING_COMPLETE",
		RESOLUTION_CHANGED : "RESOLUTION_CHANGED",
		BITRATE_CHANGED : "BITRATE_CHANGED",
		CURRENT_PLAYBACK_TIME : "CURRENT_PLAYBACK_TIME", 
		SUBTITLE: "SUBTITLE", 
		AD_START: "AD_START",
		AD_END: "AD_END",
		DECODING_COMPLETE: "DECODING_COMPLETE",
		SPARSE_TRACK: "SPARSE_TRACK", 
		//- Dormant (Prebuffering) Player Events ----------------------------------------------------	

		PREBUFFERING_CURRENT_PLAYBACK_TIME : "PREBUFFERING_CURRENT_PLAYBACK_TIME", 
		PREBUFFERING_BUFFERING_PROGRESS : "PREBUFFERING_BUFFERING_PROGRESS", 
		PREBUFFERING_SUBTITLE: "PREBUFFERING_SUBTITLE", 
		PREBUFFERING_CUSTOM: "PREBUFFERING_CUSTOM", 
		PREBUFFERING_SPARSE_TRACK: "PREBUFFERING_SPARSE_TRACK", 
		PREBUFFERING_RENDER_ERROR : "PREBUFFERING_RENDER_ERROR",

		PREBUFFERING_STREAM_INFO_READY : "PREBUFFERING_STREAM_INFO_READY",

		PREBUFFERING_RENDERING_START: "PREBUFFERING_RENDERING_START",
		PREBUFFERING_RENDERING_COMPLETE : "PREBUFFERING_RENDERING_COMPLETE",

		PREBUFFERING_BUFFERING_START : "PREBUFFERING_BUFFERING_START",
		PREBUFFERING_BUFFERING_COMPLETE : "PREBUFFERING_BUFFERING_COMPLETE",

		PREBUFFERING_RESOLUTION_CHANGED : "PREBUFFERING_RESOLUTION_CHANGED",
		PREBUFFERING_BITRATE_CHANGED : "PREBUFFERING_BITRATE_CHANGED",

		PREBUFFERING_AD_START: "PREBUFFERING_AD_START",
		PREBUFFERING_AD_END: "PREBUFFERING_AD_END",

		PREBUFFERING_DECODING_COMPLETE: "PREBUFFERING_DECODING_COMPLETE",
		PREBUFFERING_CONNECTION_FAILED : "PREBUFFERING_CONNECTION_FAILED",
		PREBUFFERING_AUTHENTICATION_FAILED : "PREBUFFERING_AUTHENTICATION_FAILED",
		PREBUFFERING_STREAM_NOT_FOUND : "PREBUFFERING_STREAM_NOT_FOUND",
		PREBUFFERING_NETWORK_DISCONNECTED : "PREBUFFERING_NETWORK_DISCONNECTED",
		PREBUFFERING_NETWORK_SLOW: "PREBUFFERING_NETWORK_SLOW",
		
		//- Adapter Events ----------------------------------------------------	
		CUSTOM: "CUSTOM", 
		DISPLAY_AREA_CHANGED: "DISPLAY_AREA_CHANGED", 
		DEBUG_MESSAGE: "DEBUG_MESSAGE"
	};
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj.events);
	}
	
	/**
	* @fn		log
	* @brief	
	*
	* @param[in]/[out]	: msg
	* @return			: Obj.prototype.log =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.log = function(msg) {
		msg = "[PLAYER ADAPTER] " + msg;
		this.dispatch(webapis.adframework.PlayerAdapter.events.DEBUG_MESSAGE, { 
			message: msg
		});
		console.log(msg, 1);
	};
	
	
	return Obj;
}());

/**
 * @brief TizenAdapter Model.
 * @details A BluePrint of TizenAdapter Model
 * @return Null
 */
webapis.adframework.TizenAdapter = (function(){
	"use strict";
	
	var dummyFunction = function(){}; //Do nothing
	
	//Constructor: set up prototype chain
	var Obj = function(sef1ID, sef2ID) {
		webapis.adframework.PlayerAdapter.call(this);
		this.initialized = false;
		this.initialize(sef1ID, sef2ID);
	};
	Obj.prototype = Object.create(webapis.adframework.PlayerAdapter.prototype);
	Obj.prototype.constructor = Obj;
	Obj.events = webapis.adframework.PlayerAdapter.events;
	
	//Internal enum that allows detection of the SEF event type
	Obj._InternalPlayerEventCodes = {
		CONNECTION_FAILED : 1,
		AUTHENTICATION_FAILED : 2,
		STREAM_NOT_FOUND : 3,
		NETWORK_DISCONNECTED : 4,
		NETWORK_SLOW : 5,
		RENDER_ERROR : 6,
		RENDERING_START : 7,
		RENDERING_COMPLETE : 8,
		STREAM_INFO_READY : 9,
		DECODING_COMPLETE : 10,
		BUFFERING_START : 11,
		BUFFERING_COMPLETE : 12,
		BUFFERING_PROGRESS : 13,
		CURRENT_PLAYBACK_TIME : 14,
		AD_START : 15,
		AD_END : 16,
		RESOLUTION_CHANGED : 17,
		BITRATE_CHANGED : 18,
		SUBTITLE : 19,
		CUSTOM : 20,
		SEEK: 30,
		SPARSE_TRACK: 101 
	};
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj._InternalPlayerEventCodes);
	}
	
	//Need to provide at least 1 ID of a SEF Player Object. Providing a second SEF Player enables prebuffering.
	/**
	* @fn		initialize
	* @brief	
	*
	* @param[in]/[out]	: sef1ID
	*					: sef2ID
	* @return			: Obj.prototype.initialize =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initialize = function(sef1ID, sef2ID) {
		var self = this;
		if(this.initialized === true) { 
			return false; 
		}
		var tizenMode = webapis.adframework.config.get("ENABLE_TIZEN");
		if(tizenMode === false){
			if(!sef1ID) { 
				throw "Missing SEF1 ID, unable to initialize SEFInterface"; 
			}
			this._sef1 = document.getElementById(sef1ID);
			if(!this._sef1) { 
				throw "Missing SEF1, unable to initialize SEFInterface"; 
			}

			if(sef2ID) { 
				this._sef2 = document.getElementById(sef2ID);
			}
			else { 
				this._sef2 = null; 
			}
		
           this._sef1.Open("Player", "1.010", "Player");
	        this._sef2.Open("Player", "1.010", "Player");
		}
		else{
		
			this._sef1 = new AVPlayer();
			this._sef2 = new AVPlayer();
		}
		
		this._OnEventHelperSEF1 = function() { 
			self.handleInternalEvent.call(self, (self.getDormantPlayer() !== self._sef1), arguments); 
		};
		this._OnEventHelperSEF2 = function() { 
			self.handleInternalEvent.call(self, (self.getDormantPlayer() !== self._sef2), arguments); 
		};
		
		this._sef1.onEvent = this._OnEventHelperSEF1;
		this._sef2.onEvent = this._OnEventHelperSEF2;
		this._player = this._sef1;
		this._playhead = null;
		this.initialized = true;
		
		this._internalPlayerDisplayArea = { 
			x:0,y:0,w:scaleArea.WIDTH,h:scaleArea.HEIGHT 
		};
	};
		
	//Initialize player
	/**
	* @fn		initPlayer
	* @brief	
	*
	* @param[in]/[out]	: url
	* @return			: Obj.prototype.initPlayer =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initPlayer = function(url) {
		return this._player.Execute("InitPlayer", url);
	};

	/**
	* @fn		startPlayback
	* @brief	
	*
	* @param[in]/[out]	: milliseconds
	* @return			: Obj.prototype.startPlayback =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.startPlayback = function(milliseconds) {
		var retVal;
		if(typeof(milliseconds) === "number" && milliseconds > 999) {
			var sec = Math.floor(milliseconds / 1000);
			retVal = this._player.Execute("StartPlayback", sec);
		}
		
		else {
			retVal = this._player.Execute("StartPlayback");
		}
	
		this._setDisplayArea();
		this.state(webapis.adframework.PlayerAdapter.State.PLAYING);
		return retVal;
	};
	
	//Play/Pause/Stop/Resume
	/**
	* @fn		play
	* @brief	
	*
	* @param[in]/[out]	: url
	*					: milliseconds
	* @return			: Obj.prototype.play =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.play = function(url, milliseconds) {
		this._playhead = 0;
		var retVal;
		if(typeof milliseconds === "number" && milliseconds > 999) {
			retVal = this._player.Execute("Play", url, Math.floor(milliseconds / 1000));
		}
		else {
			retVal = this._player.Execute("Play", url);
		}
		this._setDisplayArea();

		this.state(webapis.adframework.PlayerAdapter.State.PLAYING);
		return retVal;
	};
	
//Added by jasmine.d
	/**
	* @fn		stopDormantPlayer
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.stopDormantPlayer =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.stopDormantPlayer = function() {
		var dormantPlayer = this.getDormantPlayer();
		if(!dormantPlayer) {
			throw "Error: SEF2 was not provided upon initialization, therefore there is no secondary player to begin buffering on. Please use initialize(sef1ID, sef2ID) first.";
		}
		dormantPlayer.Execute("Stop");
	};
//end

	/**
	* @fn		stop
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.stop =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.stop = function() {
		this._playhead = null;
		this.state(webapis.adframework.PlayerAdapter.State.STOPPED);
		return this._player.Execute("Stop");
	};
	/**
	* @fn		pause
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.pause =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.pause = function() {
		var status = this._player.Execute("Pause");
		if(status === 1 ) {
		this.state(webapis.adframework.PlayerAdapter.State.PAUSED);
		}
		return status;
	};
	/**
	* @fn		resume
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.resume =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.resume = function() {
		var status = this._player.Execute("Resume");
		if(status === 1 ) {
		this.state(webapis.adframework.PlayerAdapter.State.PLAYING);
		}
		return status;
	};
	
	//Jumps forward or backward given an unsigned integer representing milliseconds. It actually needs to round down to the lowest second.
	/**
	* @fn		jump
	* @brief	
	*
	* @param[in]/[out]	: ms
	* @return			: Obj.prototype.jump =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.jump = function(ms) {
		var sec = Math.abs(Math.floor(ms/1000));
		if(typeof ms === "number" && ms < 0) {
			return this._player.Execute("JumpBackward", sec);
		}
		else {
			return this._player.Execute("JumpForward", sec);
		}
	};
	
	/**
	* @fn		jumpForward
	* @brief	
	*
	* @param[in]/[out]	: ms
	* @return			: Obj.prototype.jumpForward =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.jumpForward = function(ms) {
		if(typeof ms === "number" && ms > 0) {
			return this.jump(ms);
		}
		else {
			return false;
		}
	};
	/**
	* @fn		jumpBackward
	* @brief	
	*
	* @param[in]/[out]	: ms
	* @return			: Obj.prototype.jumpBackward =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.jumpBackward = function(ms) {
		if(typeof ms === "number" && ms > 0) {
			return this.jump(-ms);
		}
		else {
			return false;
		}
	};
	
	//Gets the duration, in MS, of the currently playing video.
	/**
	* @fn		getDuration
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getDuration =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getDuration = function() {
		return this._player.Execute("GetDuration");
	};
	
	/**
	* @fn		getPlayhead
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getPlayhead =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getPlayhead = function() {
		return this._playhead;
	};

	/**
	* @fn		IsPlaying
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isPlaying =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isPlaying = function() {
		return (this.state() === webapis.adframework.PlayerAdapter.State.PLAYING);
	};
	/**
	* @fn		IsPaused
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isPaused =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isPaused = function() {
		return (this.state() === webapis.adframework.PlayerAdapter.State.PAUSED);
	};
	/**
	* @fn		isStopped
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isStopped =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isStopped = function() {
		return (this.state() === webapis.adframework.PlayerAdapter.State.STOPPED);
	};
	
	/**
	* @fn		hasVideo
	* @brief	
	*
	* @param[in]/[out]	: streamtype
	* @return			: Obj.prototype.hasVideo =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.hasVideo = function(streamtype) {
		if(streamtype === 3) {
			return this._player.Execute("hasVideo");
		}
		else {
			return false;
		}				
	};
	
	/**
	* @fn		hasAudio
	* @brief	
	*
	* @param[in]/[out]	: streamtype
	* @return			: Obj.prototype.hasAudio =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.hasAudio = function(streamtype) {

		if(streamtype === 1) {
			return this._player.Execute("hasAudio");
		}
		else {
			return false;
		}	
	};
	
	/**
	* @fn		hasCaptions
	* @brief	
	*
	* @param[in]/[out]	: streamtype
	* @return			: Obj.prototype.hasCaptions =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.hasCaptions = function(streamtype) {
		if(streamtype === 4) {
			return this._player.Execute("hasCaptions");
		}
		else {
			return false;
		}	
	};
	
	/**
	* @fn		contentWidth
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.contentWidth =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.contentWidth = function() {
		
		return this._player.Execute("contentWidth");
	};
	/**
	* @fn		contentHeight
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.contentHeight =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.contentHeight = function() {
		return this._player.Execute("contentHeight");
	};
	/**
	* @fn		contentBitrate
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.contentBitrate =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.contentBitrate = function() {
		return this._player.Execute("contentBitrate");
	};
	
	//Get the coordinates of the display area, relative to 960x540 resolution
	/**
	* @fn		getDisplayArea
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getDisplayArea =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getDisplayArea = function() {
		return { 
			x:this._internalPlayerDisplayArea.x, 
			y:this._internalPlayerDisplayArea.y,
			w:this._internalPlayerDisplayArea.w,
			h:this._internalPlayerDisplayArea.h 
		};
	};
	
	//Gets the display area relative to the window's true size
	/**
	* @fn		getCorrectedDisplayArea
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getCorrectedDisplayArea =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getCorrectedDisplayArea = function() {
		return this.scaleFrom960(this.getDisplayArea());
	};
	/**
	* @fn		setTargetArea
	* @brief	
	*
	* @param[in]/[out]	: region
	*					: playerArea
	* @return			: Obj.prototype.setTargetArea =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setTargetArea = function(region, playerArea) {
	
		var dimms = { 
			x:playerArea.x, y:playerArea.y, w:playerArea.w, h:playerArea.h 
		};
		var displayArea = dimms;
		
		if(displayArea.w > scaleArea.WIDTH) { 
			displayArea.w = scaleArea.WIDTH; 
		}
		if(displayArea.h > scaleArea.HEIGHT) { 
			displayArea.h = scaleArea.HEIGHT; 
		}
		
		var dimms2 = { x:displayArea.x, y:displayArea.y, w:displayArea.w, h:displayArea.h };
		playerArea = dimms2;

		switch(region) {
			case webapis.adframework.PlayerAdapter.DisplayArea.LeftVideoArea:
				displayArea.x = playerArea.x;
				displayArea.w = playerArea.w - (playerArea.w/3);
				displayArea.h = playerArea.h - (playerArea.h/3);
				displayArea.y = displayArea.y + (playerArea.h - displayArea.h)/2;
				break;
				
			case webapis.adframework.PlayerAdapter.DisplayArea.RightVideoArea:
				displayArea.x = displayArea.x + playerArea.w/3;
				displayArea.w = playerArea.w - (playerArea.w/3);
				displayArea.h = playerArea.h - (playerArea.h/3);
				displayArea.y = displayArea.y + (playerArea.h - displayArea.h)/2;
				break;
				
			case webapis.adframework.PlayerAdapter.DisplayArea.LowerVideoArea:
				displayArea.w = playerArea.w - (playerArea.w/3);
				displayArea.h = playerArea.h - (playerArea.h/3);
				displayArea.x = displayArea.x + (playerArea.w - displayArea.w)/2;
				displayArea.y = displayArea.y + (playerArea.h - displayArea.h);
				break;
			
			case webapis.adframework.PlayerAdapter.DisplayArea.UpperVideoArea:
				displayArea.w = playerArea.w - (playerArea.w/3);
				displayArea.h = playerArea.h - (playerArea.h/3);
				displayArea.x = displayArea.x +(playerArea.w - displayArea.w)/2;
				displayArea.y = playerArea.y;
				break;			
				
			default:
				break;	
		}
		
		this.setDisplayArea(displayArea.x, displayArea.y, displayArea.w, displayArea.h);
	
	};
	//end by amit 
	
	//Resize and move the video window, using 960x540 scale
	/**
	* @fn		setDisplayArea
	* @brief	
	*
	* @param[in]/[out]	: x
	*					: y
	*					: w
	*					: h
	* @return			: Obj.prototype.setDisplayArea =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setDisplayArea = function(x, y, w, h) {
		
		var changeObject = {
			oldx:this._internalPlayerDisplayArea.x, 
			oldy:this._internalPlayerDisplayArea.y,
			oldw:this._internalPlayerDisplayArea.w,
			oldh:this._internalPlayerDisplayArea.h 	
		};
		
		if(typeof x === "object" && x.x) {
			this._internalPlayerDisplayArea = x;
		}
		else {
			this._internalPlayerDisplayArea = { 
				x:x, y:y, w:w, h:h 
			};
		}
		
		this._setDisplayArea();
		
		changeObject.x = this._internalPlayerDisplayArea.x;
		changeObject.y = this._internalPlayerDisplayArea.y;
		changeObject.w = this._internalPlayerDisplayArea.w;
		changeObject.h = this._internalPlayerDisplayArea.h;
		
		this.dispatch(webapis.adframework.PlayerAdapter.events.DISPLAY_AREA_CHANGED, changeObject);
	};	
	//Resize and move the video window, using truw window scale
	/**
	* @fn		setCorrectedDisplayArea
	* @brief	
	*
	* @param[in]/[out]	: x
	*					: y
	*					: w
	*					: h
	* @return			: Obj.prototype.setCorrectedDisplayArea =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setCorrectedDisplayArea = function(x, y, w, h) {
		var dimms = { 
			x:x, y:y, w:w, h:h 
		};
		if(typeof x === "object" && x.x) {
			dimms = x;
		}
		var scaledDimms = this.scaleTo960(dimms);
		
		if(scaledDimms.w > scaleArea.WIDTH) { 
			scaledDimms.w = scaleArea.WIDTH; 
		}
		if(scaledDimms.h > scaleArea.HEIGHT) {
			scaledDimms.h = scaleArea.HEIGHT; 
		}
		
		this.setDisplayArea(scaledDimms.x, scaledDimms.y, scaledDimms.w, scaledDimms.h);
	};
	
	/**
	* @fn		getCurrentSEFString
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getCurrentSEFString =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getCurrentSEFString = function() {
		return (this.getDormantPlayer() === this._sef2) ? "1 (a)" : "2 (a)";
	};
	
	/**
	* @fn		getDormantSEFString
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getDormantSEFString =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getDormantSEFString = function() {
		return (this.getDormantPlayer() === this._sef1) ? "1 (d)" : "2 (d)";
	};

	/**
	* @fn		startBufferingVideo
	* @brief	
	*
	* @param[in]/[out]	: url
	*					: ms
	* @return			: Obj.prototype.startBufferingVideo =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.startBufferingVideo = function(url, ms, prefunc) {
		if(typeof prefunc === "function") {
			;/*NULL*/
		}
		else {
				;/*NULL*/
		}
		this.log("starting Prebuffering of url " + url + " in startBufferingVideo ");
        	this._prebufferedURL = url;
		this._miliseconds = Math.floor(ms/1000);
	};
	
	/**
	* @fn		playBufferedVideo
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.playBufferedVideo =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.playBufferedVideo = function() {
	
		if(!this.getDormantPlayer()) {
			throw "Error: SEF2 was not provided upon initialization, therefore there is no secondary player to begin buffered playback on. Please use initialize(sef1ID, sef2ID) first.";
		}
		var url = this._prebufferedURL;//by amit tyagi
		var ms = this._miliseconds;
		this.swapPlayers();
        	var retVal = this._player.Execute("Play", url, ms);
		this.state(webapis.adframework.PlayerAdapter.State.PLAYING);	//added by jasmine.d
		this._prebufferedURL = null;
		this._setDisplayArea();
		this._miliseconds = 0;
		return retVal;
	};
	
	/**
	* @fn		state
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.state =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.state = function(newObject){
		if( typeof newObject !== "undefined") { 
			this._player._state = newObject; 
		}
		else{	
			return this._player._state; 
		}
	};
	
	//Returns the URL of the currently buffered video (if any)
	/**
	* @fn		cancelBufferedVideo
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.cancelBufferedVideo =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.cancelBufferedVideo = function() {
		if(this._prebufferedURL && typeof this._prebufferedURL !== "undefined"){
		
			this.log("Cancelling Buffered Url " + this._prebufferedURL);
		this._prebufferedURL = null;
		var dormantPlayer = this.getDormantPlayer();
		var tempOnEvent = dormantPlayer.onEvent; //HACK: Save event handler from dormantPlayer because we're about to override it with a hack
		try {
			dormantPlayer.onEvent = dummyFunction; //HACK: Temporarily shut down events from the dormant player so that we don't get any weird rendering errors
			dormantPlayer.Execute("Stop");
		}
		catch(e) {
			; /*NULL*/
		}
		dormantPlayer.onEvent = tempOnEvent; //HACK: Restore event handling to the dormant player
		}
		else{
			//Do Nothing
		}
	};
	
	//Returns the URL of the currently buffered video (if any)
	/**
	* @fn		getBufferedVideoURL
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getBufferedVideoURL =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getBufferedVideoURL = function() {
		return this._prebufferedURL;
	};
	
	//Other less commonly used functions
	/**
	* @fn		close
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.close =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.close = function() {
		this._sef1.Execute("Close");
		if(this._sef2) { 
			this._sef2.Execute("Close"); 
		}
	};
	/**
	* @fn		getInternalPlayer
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getInternalPlayer =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getInternalPlayer = function() {
		return this._player;
	};
	
	//Allow app developers to call Execute on the current player
	/**
	* @fn		Execute
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.Execute =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.Execute = function() {
		var command = arguments[0];
		if(command === "SetDisplayArea") {
			this.setDisplayArea(arguments[1], arguments[2], arguments[3], arguments[4]);
		}
		else {
			return this._player.Execute.apply(this._player, arguments);
		}
	};
	
	//Allow app developers to call Execute on both players (both Dormant and Active)
	/**
	* @fn		ExecuteOnAll
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.ExecuteOnAll =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.ExecuteOnAll = function() {
		var command = arguments[0];
		if(command === "SetDisplayArea") {
			this.setDisplayArea(arguments[1], arguments[2], arguments[3], arguments[4]);
		}
		else {
			if(this.getDormantPlayer()) {
				this.getDormantPlayer().Execute.apply(this.getDormantPlayer(), arguments);
			}
			return this._player.Execute.apply(this._player, arguments);
		}
	};
	
	//Gets the dormant player (the one that is not being used to play any video - we'll use this one for prebuffering)
	/**
	* @fn		getDormantPlayer
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getDormantPlayer =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getDormantPlayer = function() {
		if(!this._sef2) {
			return null;
		}
		if(this._sef1 === this._player) {
			return this._sef2;
		}
		else {
			return this._sef1;
		}
	};
	
	//Stop the currently active player, and make the dormant player become the active player
	/**
	* @fn		swapPlayers
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.swapPlayers =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.swapPlayers = function() {
		var dormantPlayer = this.getDormantPlayer();
		if(!dormantPlayer) {
			return;
		}
		else {
			this.stop();
			this._player = dormantPlayer;
			this._prebufferedURL = null;
		}
	};
	
	/**
	* @fn		_setDisplayArea
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype._setDisplayArea =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype._setDisplayArea = function() {
		if(this._internalPlayerDisplayArea) {
			this._player.Execute("SetDisplayArea", this._internalPlayerDisplayArea.x, this._internalPlayerDisplayArea.y, this._internalPlayerDisplayArea.w, this._internalPlayerDisplayArea.h, 540, false);
		}
	};
	
	var RenderErrorCode = {
		0: "Unknown",
		1: "Unsupported container",
		2: "Unsupported video codec",
		3: "Unsupported audio codec",
		4: "Unsupported video resolution"
	};
	//Single handler to detect event type and then delegate events to the correct handler
	/**
	* @fn		handleInternalNetworkEvent
	* @brief	
	*
	* @param[in]/[out]	: isActivePlayer
	*			: type
	* @return			: Obj.prototype.handleInternalNetworkEvent =
	* @warning			: Integer
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleInternalNetworkEvent = function(isActivePlayer, type) {
	if (type === Obj._InternalPlayerEventCodes.CONNECTION_FAILED) {
			this.log("SRID CONNECTION FAILED ");
			if (isActivePlayer) {
				this.dispatch(webapis.adframework.PlayerAdapter.events.CONNECTION_FAILED);
			}
			else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_CONNECTION_FAILED);
				this._prebufferedURL = null;
				this.getDormantPlayer().Execute("Stop");
			}
		}
		else if (type === Obj._InternalPlayerEventCodes.AUTHENTICATION_FAILED) {
		this.log("SRID AUTHENTICATION FAILED ");
			if (isActivePlayer) {
				this.dispatch(webapis.adframework.PlayerAdapter.events.AUTHENTICATION_FAILED);
			}
			else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_AUTHENTICATION_FAILED);
				this._prebufferedURL = null;
				this.getDormantPlayer().Execute("Stop");
			}
		}
		
		else if (type === Obj._InternalPlayerEventCodes.STREAM_NOT_FOUND) {
			this.log("SRID STREAM_NOT_FOUND ");
			if (isActivePlayer) {
				this.dispatch(webapis.adframework.PlayerAdapter.events.STREAM_NOT_FOUND);
				}
			else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_STREAM_NOT_FOUND);
				this._prebufferedURL = null;
				this.getDormantPlayer().Execute("Stop");
			}
		}
	
		else if (type === Obj._InternalPlayerEventCodes.NETWORK_DISCONNECTED) {
		this.log("SRID NETWORK_DISCONNECTED FAILED ");
			if (isActivePlayer) {
				this.dispatch(webapis.adframework.PlayerAdapter.events.NETWORK_DISCONNECTED);
			}
			else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_NETWORK_DISCONNECTED);
				this._prebufferedURL = null;
				this.getDormantPlayer().Execute("Stop");
			}
		}

		else if (type === Obj._InternalPlayerEventCodes.NETWORK_SLOW) {
			if (isActivePlayer) {
				this.dispatch(webapis.adframework.PlayerAdapter.events.NETWORK_SLOW);
			}
			else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_NETWORK_SLOW);
			}
		}

		else if (type === Obj._InternalPlayerEventCodes.RENDERING_START) {
			this.log("SRID RENDERING_START ");
			if (isActivePlayer) {
				this.dispatch(webapis.adframework.PlayerAdapter.events.RENDERING_START);
			}
			else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_RENDERING_START);
			}
		}
			
		else if (type === Obj._InternalPlayerEventCodes.RENDERING_COMPLETE) {
		this.log("SRID RENDERING_COMPLETE ");
			if (isActivePlayer) {
				this.dispatch(webapis.adframework.PlayerAdapter.events.RENDERING_COMPLETE);
			}
			else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_RENDERING_COMPLETE);
			}
		}
	
		else if (type === Obj._InternalPlayerEventCodes.STREAM_INFO_READY) {
			this.log("SRID STREAM_INFO_READY ");
			if (isActivePlayer) {
				this.dispatch(webapis.adframework.PlayerAdapter.events.STREAM_INFO_READY);
			}
			else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_STREAM_INFO_READY);
			}
		}

		else if (type === Obj._InternalPlayerEventCodes.DECODING_COMPLETE) {
			if (isActivePlayer) {
				this.dispatch(webapis.adframework.PlayerAdapter.events.DECODING_COMPLETE);
			}
			else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_DECODING_COMPLETE);
			}
		}

		else if (type === Obj._InternalPlayerEventCodes.BUFFERING_START) {
			if (isActivePlayer) {
				this.dispatch(webapis.adframework.PlayerAdapter.events.BUFFERING_START);
			}
			else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_BUFFERING_START);
			}
		}
			
		else if (type === Obj._InternalPlayerEventCodes.BUFFERING_COMPLETE) {
			if (isActivePlayer) {
				this.dispatch(webapis.adframework.PlayerAdapter.events.BUFFERING_COMPLETE);
			}
			else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_BUFFERING_COMPLETE);
			}
		}
		else {
			return 1;
		}
	
	};
	
	//Single handler to detect event type and then delegate events to the correct handler
	/**
	* @fn		handleInternalEvent
	* @brief	
	*
	* @param[in]/[out]	: isActivePlayer
	*					: args
	* @return			: Obj.prototype.handleInternalEvent =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleInternalEvent = function(isActivePlayer, args) {
		var type = args[0];
		var ret = this.handleInternalNetworkEvent(isActivePlayer, type);
		args = Array.prototype.slice.call(args, 1, args.length);	

		if(ret !== 1) {
			;/*NULL*/
		}
		else if (type === Obj._InternalPlayerEventCodes.AD_START) {
			if (isActivePlayer) {
				this.dispatch(webapis.adframework.PlayerAdapter.events.AD_START);
			}
			else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_AD_START);
			}
		}
			
		else if (type === Obj._InternalPlayerEventCodes.AD_END) {
			if (isActivePlayer) {
				this.dispatch(webapis.adframework.PlayerAdapter.events.AD_END);
			}
			else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_AD_END);
			}
		}
		else if (type === Obj._InternalPlayerEventCodes.RESOLUTION_CHANGED) {
			if (isActivePlayer) {
				this.dispatch(webapis.adframework.PlayerAdapter.events.RESOLUTION_CHANGED);
			}
			else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_RESOLUTION_CHANGED);
			}
		}

		else if (type === Obj._InternalPlayerEventCodes.BITRATE_CHANGED) {
			if (isActivePlayer) {
				this.dispatch(webapis.adframework.PlayerAdapter.events.BITRATE_CHANGED);
			}
			else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_BITRATE_CHANGED);
			}
		}	
		else if(type === Obj._InternalPlayerEventCodes.RENDER_ERROR) {
			this.log("SRID RENDER_ERROR ");
			var eventMapRender = {
				code: args[0],
				message: RenderErrorCode[args[0]]
			};
			
			if(isActivePlayer) { 
				this.dispatch(webapis.adframework.PlayerAdapter.events.RENDER_ERROR, eventMapRender);
			}
			else { 
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_RENDER_ERROR, eventMapRender);
			}
		}
			
		else if(type === Obj._InternalPlayerEventCodes.BUFFERING_PROGRESS) {
			var eventMapBuffering = {
				percent: args[0]
			};
			
			if(isActivePlayer) { 
				this.dispatch(webapis.adframework.PlayerAdapter.events.BUFFERING_PROGRESS, eventMapBuffering);
			}
			else { 
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_BUFFERING_PROGRESS, eventMapBuffering);
			}
		}
		
		else if(type === Obj._InternalPlayerEventCodes.CURRENT_PLAYBACK_TIME) {
			
			var ms = args[0];
			
			try {
				if(ms && (!isNaN(parseInt(ms))) ) {
					ms = parseInt(ms);
				}
				
			}
			catch(e){
				; /*NULL*/
			}
			
			var eventMapPlayback = {
				ms: ms
			};
			this.log("SRID CURRENT_PLAYBACK_TIME = " + ms);
			if(isActivePlayer) { 
				if(this._playhead === ms) { 
					return; 
				}
				this._playhead = ms;
				this.dispatch(webapis.adframework.PlayerAdapter.events.CURRENT_PLAYBACK_TIME, eventMapPlayback);
		}
			else { 
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_CURRENT_PLAYBACK_TIME, eventMapPlayback);
		}
		}
		
		else if(type === Obj._InternalPlayerEventCodes.SUBTITLE) {
			var eventMapSubtitle = {
				subtitle: args[0],
				time: args[1],
				properties: args[2]
			};
			
			if(isActivePlayer) { 
				this.dispatch(webapis.adframework.PlayerAdapter.events.SUBTITLE, eventMapSubtitle);
			}
			else { 
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_SUBTITLE, eventMapSubtitle);
			}
		}
		else if(type === Obj._InternalPlayerEventCodes.CUSTOM) {
			var eventMapCustom = {
				arguments: args
			};
			
			if(isActivePlayer) { 
				this.dispatch(webapis.adframework.PlayerAdapter.events.CUSTOM, eventMapCustom);
		}
		else {
				this.dispatch(webapis.adframework.PlayerAdapter.events.PREBUFFERING_CUSTOM, eventMapCustom);
			}
		}
		else if(type === Obj._InternalPlayerEventCodes.SPARSE_TRACK) {
			var eventMap = {
				time: args[0],
				data: args[1]
			};
			
			if(isActivePlayer) { 
				this.dispatch(SAMSUNG_AD_FRAMEWORK_20140320.PlayerAdapter.events.SPARSE_TRACK, eventMap);
			}
			else { 
				this.dispatch(SAMSUNG_AD_FRAMEWORK_20140320.PlayerAdapter.events.PREBUFFERING_SPARSE_TRACK, eventMap);
			}
		}
		
		else {
				; /*NULL*/
		}
	};
	
	return Obj;
}());

/*
 * webapis.adframework.avplayer 
 * Author: Amit Tyagi
 * Version: 
 * Provides a wrapper class that can manipulate the player. Also provides prebuffering logic, and a multi-listener event model.
 */
	
var logError = function (err) {
    if (err.code){
        console.log('Error occured - code:' + err.code + ', name:' + err.name + ', message:' + err.message); 
    }
    else {
        console.log('Error occured: ' + err.message);
    }
};


function AVPlayer() {
	var self = this;
	this.flag = false;
	this.eventInfo = {
		type : 0, 
		param : 0
	};
	this.scaleArea = {
			WIDTH : 1920,
			HEIGHT : 910
	};
	//Enum that allows detection of the SEF event type
	this._InternalPlayerEventCodes = {
		CONNECTION_FAILED : 1,
		AUTHENTICATION_FAILED : 2,
		STREAM_NOT_FOUND : 3,
		NETWORK_DISCONNECTED : 4,
		NETWORK_SLOW : 5,
		RENDER_ERROR : 6,
		RENDERING_START : 7,
		RENDERING_COMPLETE : 8,
		STREAM_INFO_READY : 9,
		DECODING_COMPLETE : 10,
		BUFFERING_START : 11,
		BUFFERING_COMPLETE : 12,
		BUFFERING_PROGRESS : 13,
		CURRENT_PLAYBACK_TIME : 14,
		CURRENT_DISPLAY_TIME: 14,
		AD_START : 15,
		AD_END : 16,
		RESOLUTION_CHANGED : 17,
		BITRATE_CHANGED : 18,
		SUBTITLE : 19,
		CUSTOM : 20,
		SEEK: 30,
		SPARSE_TRACK: 101, 
		// RENDER_ERROR 
		UNKNOWN_ERROR: 0,
		UNSUPPORTED_CONTAINER: 1,
		UNSUPPORTED_VIDEO_CODEC: 2,
		UNSUPPORTED_AUDIO_CODEC: 3,
		UNSUPPORTED_VIDEO_RESOLUTION: 4,
		UNSUPPORTED_VIDEO_FRAMERATE: 5,
		CURRUPTED_STREAM: 6
	};
	
	this._MediaEvent =	{
		EVENT_MEDIA_CONTROL: 1,
		EVENT_MEDIA_PLAY_TIME: 2,
		EVENT_MEDIA_BUFFERING: 3,
		EVENT_MEDIA_ERROR: 4,
		EVENT_MEDIA_CUSTOM: 5,
		EVENT_MEDIA_BITRATE_CHANGE: 6,
		// Media Error codes
		MEDIA_ERROR_CONNECT: 7,
		MEDIA_ERROR_AUTH: 8,
		MEDIA_ERROR_NOFILE: 9,
		MEDIA_ERROR_NETWORK_TIMEOUT: 9,
		MEDIA_ERROR_NETWORK: 10,
		MEDIA_ERROR_CONTAINER: 11,
		MEDIA_ERROR_VIDEO_CODEC: 12,
		MEDIA_ERROR_AUDIO_CODEC: 13,
		MEDIA_ERROR_VIDEO_PROFILE: 14,
		MEDIA_ERROR_VIDEO_FRAMERATE: 15,
		MEDIA_ERROR_VIDEO_RESOLUTION: 16,
		MEDIA_ERROR_VIDEO_DATA: 17,
		MEDIA_ERROR_UNKNOWN: 18,
		MEDIA_ERROR_PICTURE_DECODE: 19,
		MEDIA_ERROR_PICTURE_DATA: 20,
		MEDIA_ERROR_PICTURE_NOT_SUPPORTED: 21,
		MEDIA_ERROR_IO: 22,
		// Buffering events 
		MEDIA_BUFFER_START : 23,
		MEDIA_BUFFER_END: 23,
		// Media Control events
		MEDIA_CONTROL_PLAY: 24,
		MEDIA_CONTROL_EJECT: 25,
		MEDIA_CONTROL_RENDER_DONE: 26,
		MEDIA_CONTROL_SKIP: 27,
		MEDIA_CONTROL_LOAD: 28,
		MEDIA_CONTROL_DECODING_DONE: 29,
		//MediaSwitch evetns
		MEDIA_SWITCH_AD_START: 30,
		MEDIA_SWITCH_AD_END: 31,
		MEDIA_SWITCH_RESOLUTION: 32
	};
	
	this.listener = {
            onbufferingstart: function() {
                console.log("Buffering start.");	
		self.eventInfo.type = self._MediaEvent.EVENT_MEDIA_CONTROL;
		self.eventInfo.param = self._MediaEvent.MEDIA_CONTROL_LOAD;
		self.mediaOnEvent(self.eventInfo);				
		self.eventInfo.type = self._MediaEvent.EVENT_MEDIA_BUFFERING;
		self.eventInfo.param = self._MediaEvent.MEDIA_BUFFER_START;
		self.mediaOnEvent(self.eventInfo);
            },
            onbufferingprogress: function(percent) {
                console.log("Buffering progress data : " + percent);
               	self.eventInfo.type = self._MediaEvent.EVENT_MEDIA_BUFFERING;
				if(percent > 0 && percent < 100) {
					self.eventInfo.param = percent;  
				}
				else { 
					;/*NULL*/
				}
				self.mediaOnEvent(self.eventInfo);
            },
            onbufferingcomplete: function() {
                console.log("Buffering complete.");
	    	self.eventInfo.type = self._MediaEvent.EVENT_MEDIA_CONTROL;
		self.eventInfo.param = self._MediaEvent.MEDIA_CONTROL_PLAY;
		self.mediaOnEvent(self.eventInfo);
		self.eventInfo.type = self._MediaEvent.EVENT_MEDIA_BUFFERING;
		self.eventInfo.param = self._MediaEvent.MEDIA_BUFFER_END;
		self.mediaOnEvent(self.eventInfo);
            },
            oncurrentplaytime: function(currentTime) {
                console.log("Current playtime: " + currentTime);
		self.eventInfo.type = self._MediaEvent.EVENT_MEDIA_PLAY_TIME;
		self.eventInfo.param = parseInt(currentTime);
		self.mediaOnEvent(self.eventInfo);
            },
            onavplayercallback: function(eventType, eventData) {
		console.log("event type error : " + eventType + ", eventData: " + eventData);
            },
	    oneventcallback: function(msg) {	
		console.log("oneventcallback: " + msg);
            },
	    onstreamcompleted : function() {
		console.log("onstream completed .");
		self.eventInfo.type = self._MediaEvent.EVENT_MEDIA_CONTROL;
		self.eventInfo.param = self._MediaEvent.MEDIA_CONTROL_RENDER_DONE; 
		self.mediaOnEvent(self.eventInfo);
	    }
    	};	
    	this.mediaOnEvent = function(args) {
		console.log("onEvent Arguments: " + args.type);
		var param1 = 0;
		var param2 = 0;
		var param3 = 0;
		switch(args.type)
		{
			case this._MediaEvent.EVENT_MEDIA_PLAY_TIME:
				param1 = this._InternalPlayerEventCodes.CURRENT_PLAYBACK_TIME;
				param2 = args.param;
				break;
			case this._MediaEvent.EVENT_MEDIA_ERROR:			
				switch(args.param)
				{
					case this._MediaEvent.MEDIA_ERROR_CONNECT:
						param1 = this._InternalPlayerEventCodes.CONNECTION_FAILED;
						break;
					case this._MediaEvent.MEDIA_ERROR_AUTH:
						param1 = this._InternalPlayerEventCodes.AUTHENTICATION_FAILED;
						break;
					case this._MediaEvent.MEDIA_ERROR_NOFILE:
						param1 = this._InternalPlayerEventCodes.STREAM_NOT_FOUND;
						break;
					case this._MediaEvent.MEDIA_ERROR_CONTAINER:
						param1 = this._InternalPlayerEventCodes.RENDER_ERROR;
						param2 = this._InternalPlayerEventCodes.UNSUPPORTED_CONTAINER;
						break;
					case this._MediaEvent.MEDIA_ERROR_VIDEO_CODEC:
						param1 = this._InternalPlayerEventCodes.RENDER_ERROR;
						param2 = this._InternalPlayerEventCodes.UNSUPPORTED_VIDEO_CODEC;
						break;
					case this._MediaEvent.MEDIA_ERROR_AUDIO_CODEC:
						param1 = this._InternalPlayerEventCodes.RENDER_ERROR;
						param2 = this._InternalPlayerEventCodes.UNSUPPORTED_AUDIO_CODEC;
						break;
					default:
						return true;
				}
				break;
			case this._MediaEvent.EVENT_MEDIA_BUFFERING:
				if(args.param === this._MediaEvent.MEDIA_BUFFER_START)
				{
					param1 = this._InternalPlayerEventCodes.BUFFERING_START;
					break;
				}
				else if(args.param === this._MediaEvent.MEDIA_BUFFER_END)
				{
					param1 = this._InternalPlayerEventCodes.BUFFERING_COMPLETE;
					break;
				}	
				else if( (args.param >= 0) && (args.param < 101) )
				{
					if(args.param === 100)
					{
						param1 = this._InternalPlayerEventCodes.BUFFERING_PROGRESS;
						param2 = args.param;
						break;
					}
					else {
						;/*NULL*/
					}
					break;
				}	
				else {
						;/*NULL*/
				}
				return true;
			case this._MediaEvent.EVENT_MEDIA_CONTROL:
				if(args.param === this._MediaEvent.MEDIA_CONTROL_PLAY) {
					param1 = this._InternalPlayerEventCodes.RENDERING_START;
					break;
				}
				else if(args.param === this._MediaEvent.MEDIA_CONTROL_EJECT) {
					param1 = this._InternalPlayerEventCodes.RENDERING_COMPLETE;
					break;
				}
				else if(args.param === this._MediaEvent.MEDIA_CONTROL_RENDER_DONE) {
					param1 = this._InternalPlayerEventCodes.RENDERING_COMPLETE;
					break;
				}
				else if(args.param === this._MediaEvent.MEDIA_CONTROL_LOAD) {	
					param1 = this._InternalPlayerEventCodes.STREAM_INFO_READY;
					break;
				}
				else if(args.param === this._MediaEvent.MEDIA_CONTROL_DECODING_DONE ) {
					param1 = this._InternalPlayerEventCodes.DECODING_COMPLETE;
					break;
				}
				else {
					;/* NULL */
				}
				return true;
			default:
				return true;
		}
		this.arguments = [];
		this.arguments[0] = param1;
		this.arguments[1] = param2;
		this.arguments[2] = param3;
		console.log("param1 = " + param1 + "param2 = " + param2 + "param3 = " + param3);
		this.onEvent(param1, param2, param3);
	};
	
	this.onEvent = function(events) {
		console.log("onEvent Arguments: " + events);
	};
	
	this.Execute = function(cmd, param1, param2, param3, param4){
		switch(cmd){
			case "InitPlayer":
				this.open(param1);	//url
				this.flag = true;
				this.setListener();
				this.setDisplayRect(0, 0, this.scaleArea.WIDTH, this.scaleArea.HEIGHT);
				this.prepare();
				break;
			case "StartPlayback":
				this.playVideo();
				this.eventInfo.type = this._MediaEvent.EVENT_MEDIA_CONTROL;
				this.eventInfo.param = this._MediaEvent.MEDIA_CONTROL_LOAD;
				this.mediaOnEvent(this.eventInfo);
				if(param1) {
					var seekval = parseInt(param1) * 1000;
					this.seekTo(seekval);	//offset in millisec from where play begins
					this.eventInfo.type = this._MediaEvent.EVENT_MEDIA_CONTROL;
					this.eventInfo.param = this._MediaEvent.MEDIA_CONTROL_SKIP;
					this.mediaOnEvent(this.eventInfo);
				}
				break;
			case "Play":
				this.open(param1);	//url
				this.flag = true;
				this.setListener();
				this.setDisplayRect(0, 0, this.scaleArea.WIDTH, this.scaleArea.HEIGHT);
				this.prepare();
				this.playVideo();
				this.eventInfo.type = this._MediaEvent.EVENT_MEDIA_CONTROL;
				this.eventInfo.param = this._MediaEvent.MEDIA_CONTROL_LOAD;
				this.mediaOnEvent(this.eventInfo);	
				this.seekTo(param2 * 1000);	//offset in millisec from where play begins
				break;
			case "Stop":
				this.stopVideo();
				this.flag = false;
				break;
			case "Pause":
				var status = 0;
				status = this.pauseVideo();
				console.log("pauseVideo return = " + status);
				return status;
			case "Resume":
				return this.playVideo();
			case "JumpForward":
				this.forwardVideo(param1 * 1000);
				break;
			case "JumpBackward":
				this.backwardVideo(param1 * 1000);
				break;
			case "GetDuration":	
				return this.getDuration();
			case "contentWidth":
				return this.getcontentWidth();
			case "contentHeight":
				return this.getcontentHeight();
			case "contentBitrate":
				return this.getCurrentBitrate();
			case "hasVideo":
				return this.hasVideo();	
			case "hasAudio":	
				return this.hasAudio();	
			case "hasCaptions":
				return this.hasCaptions();	
			case "Close":
				this.close();
				break;
			case "SetDisplayArea":
				this.setDisplayRect(param1, param2, param3, param4);
				break;
			case "setTimeoutBuffering":
				this.setTimeoutBuffering(param1);
				break;
			default:
				break;
		}
		return true;
	};
	
    this.soundAnalysisListener = function (dataArray) {
        console.log("Sound analysis: " + dataArray.toString());
    };
	
    this.getDuration = function () {
        try {
            console.log("getDuration: Pass");
            return webapis.avplay.getDuration();
        } catch (e) {
            console.log("getDuration: Fail");
            logError(e);
        }
    };
	
    this.open = function (url) {
        try {
        	console.log("open: Pass");
	        webapis.avplay.open(url);
			return 1;
        } catch (e) {
		console.log("open: Fail");
        	logError(e);
	        return 0;
        }
    };
	
    this.close = function () {
        try {
            webapis.avplay.close();
            return 1;
        } catch (e) {
            logError(e);
            return 0;
        }
    };
	
    this.setDisplayRect = function (x, y, videoWidth, videoHeight) {
        try {
            console.log("setDisplayRect: Pass");
            webapis.avplay.setDisplayRect(x, y, videoWidth, videoHeight);
            return 1;
        } catch (e) {
            console.log("setDisplayRect: Fail");
            logError(e);
            return 0;
        }
    };
	
    this.setTimeoutBuffering = function (seconds) {
        try {
        	console.log("setTimeoutBuffering: Pass");
            webapis.avplay.setTimeoutForBuffering(seconds);
            return 1;
        } catch (e) {
        	console.log("setTimeoutBuffering: Fail");
            logError(e);
            return 0;
        }
    };
	
    this.prepare = function () {
        try {
        	console.log("prepare: Pass");
            webapis.avplay.prepare();
            return 1;
        } catch (e) {
        	console.log("prepare: Fail");
            logError(e);
            return 0;
        }
    };
	
	this.prepareAsync = function (successCallback, errorCallback) {
		try {
			webapis.avplay.prepareAsync(successCallback, errorCallback);
		} catch (e) {
			logError(e);
		}
	}
	
    this.setListener = function () {
        try {
        	console.log("setListener: Pass");
			webapis.avplay.setListener(this.listener);
            return 1;
        } catch (e) {
        	console.log("setListener: Fail");
            logError(e);
            return 0;
        }
    };
	
    this.playVideo = function () {
        try {
        	console.log("playVideo: Pass");
            webapis.avplay.play();
            return 1;
        } catch (e) {
        	console.log("playVideo: Fail");
            logError(e);
            return 0;
        }
    };
	
    this.pauseVideo = function () {
        try {
            webapis.avplay.pause();
            return 1;
        } catch (e) {
            logError(e);
            return 0;
        }
    };
	
    this.stopVideo = function () {
		if(this.flag === true)
		{
        try {
        	console.log("stopVideo: Pass");
            webapis.avplay.stop();
            return 1;
        } catch (e) {
        	console.log("stopVideo: Fail");
            logError(e);
            return 0;
        }
		}
    };
	
    this.forwardVideo = function (milisec) {
        try {
			var successCallback = function() {
				console.log("jumpForward: Pass");
				return 1;
			}
			
			var errorCallback = function(err) {
				throw new Error('jumpBackward - milisec: ' + milisec + ', Error:' + err.name);
				return 0;
			}
            webapis.avplay.jumpForward(milisec, successCallback, errorCallback);
        } catch (e) {
            logError(e);
            return 0;
        }
    };
	
    this.backwardVideo = function (milisec) {
        try {
			var successCallback = function() {
				console.log("jumpBackward: Pass");
				return 1;
			}
			
			var errorCallback = function(err) {
				
				throw new Error('jumpBackward - milisec: ' + milisec + ', Error:' + err.name);
				return 0;
			}
            webapis.avplay.jumpBackward(milisec, successCallback, errorCallback);
        } catch (e) {
            logError(e);
            return 0;
        }
    };
	
    this.seekTo = function (milisec) {
        try {
			var successCallback = function() {
				console.log("seekTo: Pass");
				return 1;
			}
			
			var errorCallback = function(err) {
				throw new Error('sekkTo - milisec: ' + milisec + ', Error:' + err.name);
				return 0;
			}
			webapis.avplay.seekTo(milisec, successCallback, errorCallback); 
        } catch (e) {
        	console.log("seekTo: Fail");
            logError(e);
            return 0;
        }
    };
	
    this.setSpeed = function (speed) {
        try {
            webapis.avplay.setSpeed(speed);
        } catch (e) {
            logError(e);
        }
    };
	
    this.setDRM = function (drmType, operation, params) {
        try {
            webapis.avplay.setDRM(drmType, operation, params);
        } catch (e) {
            logError(e);
        }
    };
	
    this.getCurrentTime = function () {
        try {
            return webapis.avplay.getCurrentTime();
        } catch (e) {
            logError(e);
        }
    };
	
    this.getState = function () {
        try {
            return webapis.avplay.getState();
        } catch (e) {
            logError(e);
        }
    };
	
    this.getCurrentStreamInfo = function () {
        try {
            return webapis.avplay.getCurrentStreamInfo();
        } catch (e) {
            logError(e);
        }
    };
	
    this.getTotalTrackInfo = function () {
        try {
            return webapis.avplay.getTotalTrackInfo();
        } catch (e) {
            logError(e);
        }
    };
	
    this.setExternalSubtitlePath = function (path) {
        try {
            webapis.avplay.setExternalSubtitlePath(path);
        } catch (e) {
            logError(e);
        }
    };
	
    this.setSelectTrack = function (streamType, index) {
        try {
            webapis.avplay.setSelectTrack(streamType, index);
        } catch (e) {
            logError(e);
        }
    };
	
    this.setDisplayMethod = function (displayMethod) {
        try {
            webapis.avplay.setDisplayMethod(displayMethod);
        } catch (e) {
            logError(e);
        }
    };
	
    this.setSilentSubtitle = function (hideSubtitle) {
        try {
            webapis.avplay.setSilentSubtitle(hideSubtitle);
        } catch (e) {
            logError(e);
        }
    };
	
    this.setSubtitlePosition = function (position) {
        try {
            webapis.avplay.setSubtitlePosition(position);
        } catch (e) {
            logError(e);
        }
    };
	
    this.getStreamingProperty = function (property) {
        try {
             return webapis.avplay.getStreamingProperty(property);
        } catch (e) {
            logError(e);
        }
    };
	
    this.setStreamingProperty = function (propertyType, propertyValue) {
        try {
            webapis.avplay.setStreamingProperty(propertyType, propertyValue);
        } catch (e) {
            logError(e);
        }
    };
	
    this.setSoundAnalysisListener = function () {
        try {
            webapis.avplay.setSoundAnalysisListener(this.soundAnalysisListener);
        } catch (e) {
            logError(e);
        }
    };
	
	this.unsetSoundAnalysisListener = function () {
		try {		
			webapis.avplay.unsetSoundAnalysisListener(); 
		} catch (e) {
			logError(e);
		}
	};
	
	this.hasVideo = function() {
		var streamInfo = this.getCurrentStreamInfo();
        for (var i = 0; i < streamInfo.length; i++) {
        	if(streamInfo[i].type === "VIDEO") {
				console.log("hasVideo == TRUE");
				return true;
        	}
        }   
        console.log("hasVideo == FALSE");
		return false;
    };
	
	this.hasAudio = function() {
		var streamInfo = this.getCurrentStreamInfo();
        for (var i = 0; i < streamInfo.length; i++) {
        	if(streamInfo[i].type === "AUDIO") {
        		console.log("hasAudio == TRUE");
				return true;
			}
        }   
        console.log("hasAudio == FALSE");
		return false;
    };
	
	this.hasCaptions = function() {
		var streamInfo = this.getCurrentStreamInfo();
        for (var i = 0; i < streamInfo.length; i++) {
        	if(streamInfo[i].type === "TEXT") {
        		 console.log("hasCaptions == TRUE");
				return true;
			}
        }   
        console.log("hasCaptions == FALSE");
		return false;
    };
	
	this.getcontentWidth = function() {
		var streamInfo = this.getCurrentStreamInfo();
        for (var i = 0; i < streamInfo.length && streamInfo[i].type === "VIDEO"; i++) {
        	 var res=streamInfo[i].extra_info.split(",");
        	 for (var j = 0; j < res.length; j++) { 
        		 if(res[j].indexOf("Width:") > -1) {
        			 var width = parseInt(res[j].replace("Width:",""));
        			 console.log("width = " + width);
        	   		 return width;
        		 }
        	 }
        }
        return null;
    };
	
	this.getcontentHeight = function() {
		var streamInfo = this.getCurrentStreamInfo();
        for (var i = 0; i < streamInfo.length && streamInfo[i].type === "VIDEO"; i++) {
        	 var res = streamInfo[i].extra_info.split(","); 
        	 for (var j = 0; j < res.length; j++) { 
        		 if(res[j].indexOf("Height:") > -1) {
        			 var height = parseInt(res[j].replace("Height:",""));
        			 console.log("height = " + height);
        	   		 return height;
        		 }
        	 }
        }   
        return null;
    };
	
	
	this.getCurrentBitrate = function() {
		var streamInfo = this.getCurrentStreamInfo();
        for (var i = 0; i < streamInfo.length && streamInfo[i].type === "VIDEO"; i++) {
        	 var res = streamInfo[i].extra_info.split(","); 
        	 for (var j = 0; j < res.length; j++) { 
        		 if(res[j].indexOf("Bit_rate:") > -1) {
        			 var bit_rate = parseInt(res[j].replace("Bit_rate:",""));
        			 console.log("bit_rate = " + bit_rate);
        	   		 return bit_rate;
        		 }
        	 }
        }   
        return null;
    };
	
}

if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}

/**
 * @brief Ad Model.
 * @details A BluePrint of Ad Model
 * @return Null
 */
webapis.adframework.Ad = (function() {
	"use strict";
	var Obj = function(options) {
		
		this.uid = (function() {
			function s4() {
				return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
			}
			return "ad_" + s4() + s4();
		})();

		//Required variables
		this._impressionTrackers = options.impressionTrackers || [];
		this.creatives = options.creatives || [];
		this.adSystem = options.adSystem;
		this.adTitle = options.adTitle;
		
		//Optional variables
		this.advertiser = options.advertiser;
		this.errorTrackers = options.errorTrackers || [];
		this.sequence = options.sequence;
		this.originalSequence = options.originalSequence;
		this.id = options.id;
		this.description = options.description;
		this.pricing = options.pricing;
		this.survey = options.survey;
		
		//Always starts off false
		this._played = false;
		this._skipped = false;
		this._errored = false;
		this._isPrebuffered = false;
		
		this._target = options.target || [];	
		this.sanityCheck();
		this._companionFound = false;
	};
	
	/**
	* @fn		assign
	* @brief	
	*
	* @param[in]/[out]	: options
	* @return			: Obj.prototype.assign =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.assign = function(options) {
		//Required variables
		this._impressionTrackers = options.impressionTrackers || this._impressionTrackers;
		this.creatives = options.creatives || this.creatives;
		this.adSystem = options.adSystem || this.adSystem;
		this.adTitle = options.adTitle || this.adTitle;
		
		//Optional variables
		this.advertiser = options.advertiser || this.advertiser;
		this.errorTrackers = options.errorTrackers || this.errorTrackers;
		this.sequence = options.sequence || this.sequence;
		this.id = options.id || this.id;
		
		this.sanityCheck();
	};
	
	/**
	* @fn		mergeCreative
	* @brief	
	*
	* @param[in]/[out]	: newCreative
	* @return			: Obj.prototype.mergeCreative =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.mergeCreative = function(newCreative){
		var existingCreative = null;
		var j = 0;
		if(newCreative instanceof webapis.adframework.LinearCreative ) {
			for(j = 0; j < this.creatives.length; j++) {
				if(this.creatives[j] && this.creatives[j] instanceof webapis.adframework.LinearCreative) {
					existingCreative = this.creatives[j];
					existingCreative.merge(newCreative);
					break;
				}
			}
		}
		else if(newCreative instanceof webapis.adframework.NonLinearCreative) {
			//If we have a nonlinear creative already, just add the trackers. Else, toss it
			for(j = 0; j < this.creatives.length; j++) {
				if(this.creatives[j] && this.creatives[j] instanceof webapis.adframework.NonLinearCreative) {
					existingCreative = this.creatives[j];
					existingCreative.merge(newCreative);
					break;
				}
			}
		} 
		else if(newCreative instanceof webapis.adframework.CompanionCreative) {
			//Okay, let's just push this companion into our list of other companions
			this.creatives.push(newCreative);
		}
		else {
			; /*NULL*/
		}				
	};

	//Merges a hashmap full of stuff into this Ad. If there is a conflict, it favors this ad as opposed to what's passed in.
	//This is made to help with merging Wrapper ads.
	//IMPORTANT: This ad must already have a complete and valid Linear on NonLinear Creative before merge() is called. merge() only combines companions and trackers.
	/**
	* @fn		merge
	* @brief	
	*
	* @param[in]/[out]	: options
	* @return			: Obj.prototype.merge =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.merge = function(options) {		
		this.adSystem = this.adSystem || options.adSystem;
		this.adTitle = this.adTitle || options.adTitle;
		this.sequence = this.sequence || options.sequence;
		this.id = this.id || this.id;
		this.advertiser = this.advertiser || options.advertiser;
		
		if(options.errorTrackers) {
			this.errorTrackers = this.errorTrackers.concat(options.errorTrackers);
		}
		if(options.impressionTrackers) {
			this._impressionTrackers = this._impressionTrackers.concat(options.impressionTrackers);
		}
		if(options.creatives) {
			for(var i = 0; i < options.creatives.length; i++) {
				var newCreative = options.creatives[i];
				mergeCreative( newCreative );
			}
		}
		
		this.sanityCheck();
	};
	
	/**
	* @fn		handleImpression
	* @brief	
	*
	* @param[in]/[out]	: contentPlayhead
	*					: adAssetURI
	* @return			: Obj.prototype.handleImpression =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleImpression = function(contentPlayhead, adAssetURI) {
		this._impressionTrackers.forEach(function(tracker) {
			if(tracker.shouldFire("impression")) {
				tracker.fireTracker(contentPlayhead, adAssetURI);
			}
		});
	};
	
		/**
	* @fn		handleVPAIDImpression
	* @brief	
	*
	* @param[in]/[out]	: contentPlayhead
	*					: adAssetURI
	* @return			: Obj.prototype.handleImpression =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleVPAIDImpression = function(contentPlayhead, adAssetURI) {
		var id = "impression";
		this._impressionTrackers.forEach(function(tracker) {
			if(id.toLowerCase().trim() === tracker.id)	{
				tracker.fireTracker(contentPlayhead, adAssetURI);
			}
		});
	};

	/**
	* @fn		getCreativeType
	* @brief	
	*
	* @param[in]/[out]	: creativeType
	* @return			: Obj.prototype.getCreativeType =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getCreativeType = function(creativeType) {
		var ret = null;
		for(var i = 0; i < this.creatives.length; i++) {
			var it = this.creatives[i];
			if(it instanceof creativeType) {
				ret = it;
				break;
			}
		}
		return ret;
	};
	
	/**
	* @fn		handleError
	* @brief	
	*
	* @param[in]/[out]	: code
	*					: message
	*					: contentPlayhead
	*					: adAssetURI
	* @return			: Obj.prototype.handleError =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleError = function(code, message, contentPlayhead, adAssetURI) {
		if(this.errorTrackers) {
			for (var i = 0; i < this.errorTrackers.length; i++) {
				this.errorTrackers[i].fireError(code, message, contentPlayhead, adAssetURI);
			}
		}
	};
	
	/**
	* @fn		getLinearCreative
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getLinearCreative =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getLinearCreative = function() {
		if(typeof this._linearCreative === 'undefined') {
			this._linearCreative = this.getCreativeType(webapis.adframework.LinearCreative);
		}
		return this._linearCreative;
	};
	
	/**
	* @fn		getNonLinearCreative
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getNonLinearCreative =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getNonLinearCreative = function() {
		if(typeof this._nonLinearCreative === 'undefined') {
			this._nonLinearCreative = this.getCreativeType(webapis.adframework.NonLinearCreative);
		}
		return this._nonLinearCreative;
	};

	/**
	* @fn		getCompanionCreativeArray
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getCompanionCreativeArray =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getCompanionCreativeArray = function() {
		if(typeof this._companionCreativeArray === 'undefined') {
			this._companionCreativeArray = [];
			for(var i = 0; i < this.creatives.length; i++) {
				var it = this.creatives[i];
				if(it instanceof webapis.adframework.CompanionCreative) {
					
					this._companionCreativeArray.push(it);
				}
			}
		}
		return this._companionCreativeArray;
	};
	
	/**
	* @fn		isPrebuffered
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isPrebuffered =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isPrebuffered = function() {
		return this._isPrebuffered;
	};
	
	/**
	* @fn		setPrebuffered
	* @brief	
	*
	* @param[in]/[out]	: val
	* @return			: Obj.prototype.setPrebuffered =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setPrebuffered = function(val) {
		if(val === "false"){
			this._isPrebuffered = false;
		}
		else {
			this._isPrebuffered = true;
		}
	};
	
	/**
	* @fn		isPlayed
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isPlayed =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isPlayed = function() {
		return this._played;
	};
	
	/**
	* @fn		setPlayed
	* @brief	
	*
	* @param[in]/[out]	: val
	* @return			: Obj.prototype.setPlayed =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setPlayed = function(val) {
		if(val === "false"){
			this._played = false;
			//Setting Tracker element fire status to false
			this._impressionTrackers.forEach(function(tracker) {
				tracker.resetFired();
			});
			if(this.getLinearCreative())
			{
				this.getLinearCreative().resetEventTrackers();
			}
			if(this.getNonLinearCreative())
			{
				this.getNonLinearCreative().resetEventTrackers();
			}
			if(this.getCompanionCreativeArray().length > 0)
			{
				var companions = this.getCompanionCreativeArray();
				for(var i = 0; i < companions.length; i++) {
					companions[i].resetEventTrackers();
				}
			}
		}
		else{	
			this._played = true;
		}
	};

	/**
	* @fn		isSkipped
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isSkipped =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isSkipped = function() {
		return this._skipped;
	};
	
	/**
	* @fn		setSkipped
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.setSkipped =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setSkipped = function() {
		this._skipped = true;
	};
	
	/**
	* @fn		isErrored
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isErrored =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isErrored = function() {
		return this._errored;
	};
	
	/**
	* @fn		setErrored
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.setErrored =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setErrored = function() {
		this._errored = true;
	};
	
	/**
	* @fn		setTarget
	* @brief	
	*
	* @param[in]/[out]	: targetList
	* @return			: Obj.prototype.setTarget =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setTarget = function(targetList) {
		
		this._target = targetList;
	};

	/**
	* @fn		getTarget
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getTarget =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getTarget = function() {
		
		return this._target;
	};

	/**
	* @fn		getMatchingRegion
	* @brief	
	*
	* @param[in]/[out]	: adID
	*					: type
	* @return			: Obj.prototype.getMatchingRegion =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getMatchingRegion = function(adID, type) {
		var targets =  this.getTarget();
		var region = null;
		if(targets) {
			for(var j = 0; j < targets.length; j++) {
				if(adID === targets[j].getTargetType() || type === targets[j].getTargetType()) {
					region = targets[j].getRegion();
					break;
				}
			}
		}
		return region;
	};

	/**
	* @fn		toString
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.toString =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.toString = function() {
		var str = "Ad";
		str += "\n\t adTitle=" + this.adTitle;
		str += "\n\t adSystem=" + this.adSystem;
		str += "\n\t creatives=" + this.creatives.length;
		str += "\n\t impressionTrackers=" + this._impressionTrackers.length;
		str += "\n\t errorTrackers=" + this.errorTrackers.length;
		str += "\n\t targets=" + this._target.length;//by amit
		str += "\n\t advertiser=" + this.advertiser;
		str += "\n\t sequence=" + this.sequence + " (" + this.originalSequence + ")";
		str += "\n\t played=" + this.isPlayed();
		str += "\n\t errored=" + this.isErrored();
		return str;
	};
	
	//Makes sure things are the types that they should be - should be rerun after each modification of the Ad
	/**
	* @fn		sanityCheck
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.sanityCheck =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.sanityCheck = function() {
		if(!this._impressionTrackers instanceof Array) { 
			this._impressionTrackers = []; 
		}
		if(!this.creatives instanceof Array) { 
			this.creatives = []; 
		}
		if(!this.errorTrackers instanceof Array) {
			this.errorTrackers = []; 
		}
		if(this.sequence) {
			try{ 
				this.sequence = parseInt(this.sequence); 
			}
			catch(e){
				this.sequence = null;
			}
		}
	};
	
	//Sorting function is based on sequence in an ad pod
	/**
	* @fn		Sort
	* @brief	
	*
	* @param[in]/[out]	: a
	*					: b
	* @return			: Obj.Sort =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.Sort = function(a,b) {
		if(a.sequence && b.sequence) {
			return a.sequence-b.sequence;
		}
		else if(a.sequence) {
			return -1;
		}
		else if(b.sequence) {
			return 1;
		}
		else {
			return 0;
		}
	};
	
	Obj.prototype.companionFound = function(newObject) {
	
		if(typeof newObject !== "undefined"){
			this._companionFound = newObject;
		}
		else{
			return this._companionFound;
		}
	};
	
	
	/**
	* @fn		log
	* @brief	Just some error/logging functions
	*
	* @param[in]/[out]	: str
	* @return			: Obj.prototype.log =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.log = function(str) {
		str = "[adframework PLAYER] " + str;
		console.log(str, 1);
	};
	
	return Obj;
})();

if(typeof Object.freeze === "function") {
	Object.freeze(webapis.adframework.Ad);
}

//An "BreakInfo" in the context of the v-suite is a set of advertisements occurring at a certain point in time of the linear video content.
//AdBreaks can be either prerolls, postrolls, or midrolls depending on the property of the main content or events triggered by the user.

if(typeof window.webapis.adframework !== "object") {
	window.webapis.adframework = {};
}
/**
 * @brief BreakInfo Model.
 * @details A BluePrint of BreakInfo Model
 * @return Null
 */
webapis.adframework.BreakInfo = (function() {
	"use strict";
	var Obj = function(options) {
		if(!options.offset) { 
			options.offset = 0;
		}
		
		this.uid = (function() {
			function s4() {
				return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
			}
			return "break_" + s4() + s4();
		})();
		
		this.setOffset(options.offset);
		//Required variables
		this._breakType = options.breakType;
		
		//Variables that are not technically required but they're pretty much always there
		this._ads = options.ads;
		this._eventTrackers = options.eventTrackers;
		this._errorTrackers = options.errorTrackers;
		//Optional variables
		this._breakID = options.breakID;
		
		this._adSourceID = options.adSourceID;
		
		this._allowMultipleAds = true;
		if(typeof options.allowMultipleAds !== "undefined") {
			try { this._allowMultipleAds = webapis.adframework.utils.parseBoolean(options.allowMultipleAds); }
			catch (e) { this._allowMultipleAds = true; }
		}
		if(this._allowMultipleAds && (this.getAds().length && this.getAds().length > 1)) {
			;/*NULL*/
		}
		
		if(typeof options.followRedirects !== "undefined") {
			try { this._followRedirects = webapis.adframework.utils.parseBoolean(options.followRedirects); }
			catch (e) { this._followRedirects = true; }
		}

		this._extensions = options.extensions || [];
		
		this._skipped = false;

		var repeatAfterMS = options.repeatAfter;
		if(typeof options.repeatAfter === "string") {
			repeatAfterMS = webapis.adframework.utils.getTimeInt(options.repeatAfter);
		}
		if(typeof repeatAfterMS === "number" && repeatAfterMS > 1000) {
			this._repeatAfter = repeatAfterMS;
		}

		if(typeof options.adBreakXMLString === "string") {
			this._adBreakXMLString = options.adBreakXMLString;
		}

		if(typeof options.parsingContext === "object") {
			this._parsingContext = options.parsingContext;
		}
		
		this._played = false;
		this._repeatCount = 0;
		this._nonLinearFound = false;
		this._currentTriggerEvent = webapis.adframework.ContentManager.MEvents.NONE;
	};
	
	
	//Returns a boolean that specifies whether this ad break is set to repeat.
	Obj.prototype.isRepeating = function() {
		var truth = (typeof(this._repeatAfter) === "number" && typeof(this._adBreakXMLString) === "string" && typeof(this._parsingContext) === "object");
		return truth;
	};

	//Given a current time in milliseconds, return a promise for a duplicate repeating ad break.
	//The duplicate ad break will have all of the data that this ad break contains, except that it will re-parse its AdSource node (to get new ads from the ad server).
	Obj.prototype.createRepeatingAdBreakPromise = function(currentMS, duration) {
		var self = this;

		if(!this.isRepeating() || typeof(currentMS) !== "number" || (duration > 0 && (currentMS + this._repeatAfter) >= duration)){
			this.log("Missing properties that are required for a repeating ad break. Aborting...");
			return false;
		}

		//This is a replication of the original XML node that this ad break was parsed from
		var parsedXML = new DOMParser().parseFromString(this._adBreakXMLString, "text/xml");
		var adBreakNode = null;
		if(parsedXML) {
			var adBreakNodes = parsedXML.getElementsByTagName("AdBreak");
			if(adBreakNodes && adBreakNodes.length) {
				adBreakNode = adBreakNodes[0];
			}
		}

		//Check if we have a valid ad break node to parse
		if(!adBreakNode) {
			this.log("Could not schedule repeating adbreak: to find an ad break node...");
			return false;
		}

		//This is the content offset that the repeating ad break will occur at
		var repeatMS = webapis.adframework.utils.getTimeString(currentMS + this._repeatAfter);
		var repeatCount = this._repeatCount + 1;

		//This is my promise to give back a repeating ad break
		var myPromise = new webapis.adframework.Promise();

		//This is the Parser's promise that I will get an ad break
		var breakPromise = new webapis.adframework.Promise();
		breakPromise.onSuccess(function(newAdBreak) {
			newAdBreak.setOffset(repeatMS) ;
			newAdBreak.setRepeatCount(repeatCount);
			myPromise.reportSuccess(newAdBreak);
		}).onFailure(function(result) {
			self.log("Failed to create repeating adbreak: " + result);
		});

		webapis.adframework.VMAPParser.parseVMAPAdBreakNodeAsync(adBreakNode, breakPromise, this._parsingContext);

		return myPromise;
	};
	
	//Clears repeat data from this ad break (saving memory)
	Obj.prototype.deleteRepeatData = function() {
		this._parsingContext = null;
		this._repeatAfter = null;
		this._adBreakXMLString = null;
	};
	
	/**
	* @fn		setStartTime
	* @brief	
	*
	* @param[in]/[out]	: date
	* @return			: Obj.prototype.setStartTime 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setStartTime = function(date) {
		this.date = date;
	};
	
	/**
	* @fn		getStartTime
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getStartTime 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getStartTime = function() {
                //Always advised to return null in case it is undefined
                if(typeof this.date === "undefined" || this.date === null) {
                        return null;                
                }
		return this.date;
	};
	
	/**
	* @fn		hasPod
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.hasPod 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.hasPod = function() {
		if(typeof this._hasAdPod === "undefined") {
			if(this.getAds().length && this.getAds()[0].sequence) {
				this._hasAdPod = true;
			}
			else {
				this._hasAdPod = false;
			}
		}
		return this._hasAdPod;
	};
	
	/**
	* @fn		getNextAd
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getNextAd 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getNextAd = function() {
		//TODO: Allow some parameters for pods, etc
		var nextAd = null;
		for(var i = 0; i < this.getAds().length; i++) {
			var ad = this.getAds()[i];
            if(ad.isErrored()){
				//Skip the ad since it's errored
				; /*NULL*/
			}
			else if(!ad.isPlayed()) {
				nextAd = ad;
				break;
			}
			else {
				; /*NULL*/
			}	
		}
		return nextAd;
	};

	//To return only those ads which have Linear Creative
	/**
	* @fn		getNextLinearAd
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getNextAd 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getNextLinearAd = function() {
		//TODO: Allow some parameters for pods, etc
		var nextAd = null;
		for(var i = 0; i < this.getAds().length; i++) {
			var ad = this.getAds()[i];
            if(ad.isErrored()){
				//Skip the ad since it's errored
					; /*NULL*/
			}
			else if(!ad.isPlayed() && ad.getLinearCreative()) {
				nextAd = ad;
				break;
			}
			else {
				; /*NULL*/
			}	
		}
		return nextAd;
	};
	/**
	* @fn				: handleBreakStart
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: void 
	* @warning			: None
	* @exception		: None
	* @see
	*/	
	Obj.prototype.handleBreakStart = function() {
		this.handleEvent("breakStart");
	};
	
	/**
	* @fn				: handleBreakEnd
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: void 
	* @warning			: None
	* @exception		: None
	* @see
	*/	
	Obj.prototype.handleBreakEnd = function() {
		this.handleEvent("breakEnd");
	};	
	
	/**
	* @fn		handleError
	* @brief	
	*
	* @param[in]/[out]	: code
	*					: message
	*					: contentPlayhead
	*					: adAssetURI
	* @return			: Obj.prototype.handleError 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleError = function(code, message, contentPlayhead, adAssetURI) {
		if(this._errorTrackers) {
			for (var i = 0; i < this._errorTrackers.length; i++) {
				this._errorTrackers[i].fireError(code, message, contentPlayhead, adAssetURI);
			}
		}
	};
	
	Obj.prototype.handleEvent = function(id, adPlayhead, adDuration, contentPlayhead, adAssetURI) {
		this._eventTrackers.forEach(function(tracker) {
			if(tracker.shouldFire(id, adPlayhead, adDuration)) {
				tracker.fireTracker(contentPlayhead, adAssetURI);
			}
		});
	};
	
	/**
	* @fn				: getAds
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getAds 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getAds = function() {
		return this._ads;
	};
	
	
	Obj.prototype.createCondition = function(offset){
	
		var l_type = webapis.adframework.Condition.ConditionType.EVENT;
		var l_name = webapis.adframework.ContentManager.MEvents.NONE;
		var l_val = "";
		var l_op = "";
		var condObj = [];
		
		if(offset.toLowerCase().trim() === "end") {
			l_name = webapis.adframework.ContentManager.MEvents.OnItemEnd;
		}
		else{
			if(offset.toLowerCase().trim() === "start") {
				offset = 0;
			}
			l_type = webapis.adframework.Condition.ConditionType.PROPERTY;
			l_name = webapis.adframework.Scheduler.Property.Position;
			l_val = offset;
			l_op = webapis.adframework.Condition.Operator.GREATEREQ;
		}
	
		condObj.push(new webapis.adframework.Condition({
			type: l_type,
			name: l_name,
			value: l_val,
			operator: l_op
		}));
		
		return condObj;
	};
	
	/**
	* @fn		getOffset
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getOffset 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getOffset = function() {
		return this._offset;
	};
	
	/**
	* @fn		setOffset
	* @brief	
	*
	* @param[in]/[out]	: offset
	* @return			: Obj.prototype.setOffset 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setOffset = function(offset) {
		if(!offset) {
			return;
		}

		if(typeof offset === "number") {
			offset = webapis.adframework.utils.getTimeString(offset);
		}
		
		//Create Conditional Offset First
		if(!(offset.startCondition || offset.endCondition)){
			var offsetParams = {
				startCondition: this.createCondition(offset),
				endCondition: []
			};
		    offset = offsetParams;
		}
		
		if(offset instanceof webapis.adframework.Offset) {
			this._offset = offset;
		}
		else{
			this._offset = new webapis.adframework.Offset(offset);
		}
	};
	
	/**
	* @fn		setRepeatCount
	* @brief	
	*
	* @param[in]/[out]	: None
	* @return			: Obj.prototype.setRepeatCount 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setRepeatCount = function(repeat) {
		this._repeatCount = repeat;
	};
	
	
	/**
	* @fn		isPlayed
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isPlayed 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isPlayed = function() {
		return this._played;
	};
	
	/**
	* @fn		setPlayed
	* @brief	
	*
	* @param[in]/[out]	: val
	* @return			: Obj.prototype.setPlayed 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setPlayed = function(val) {
		if(val === "false")
		{	
			this._played = false;
			for(var i = 0; i < this.getAds().length; i++) {
				this.getAds()[i].setPlayed("false"); 
				this.getAds()[i].setPrebuffered("false");
			}
		}
		else{
			this._played = true;
		}
	};
	
	Obj.prototype.nonLinearFound = function(val) {
		this._nonLinearFound = val;
	};
	
	Obj.prototype.isNonLinearFound = function() {
		return this._nonLinearFound;
	};
	
	Obj.prototype.triggerEventType = function(newObject) {
		if(typeof newObject !== "undefined") { 
			this._currentTriggerEvent = newObject; 
		}
		else {
			return this._currentTriggerEvent; 
		}
	};
	
	//"Skipped" means that we have fast-forwarded past this midroll's trigger point and are not playing the midroll.
	Obj.prototype.isSkipped = function() {
		return this._skipped;
	};
	Obj.prototype.setSkipped = function() {
		this._skipped = true;
	};
	//If we rewind back to before the skipped midroll's position, we can restore it.
	Obj.prototype.unsetSkipped = function() {
		this._skipped = false;
	};
	
	/**
	* @fn		test
	* @brief	
	*
	* @param[in]/[out]	: playhead
	*					: duration
	* @return			: Obj.prototype.test 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.test = function(playhead, duration) {
		return (!this.isPlayed()) && this.getOffset().test(playhead, duration);
	};
	
	
	Obj.prototype.log = function(str) {
		str = "[ADFW ADBREAK] " + str;
		if(webapis.adframework.config.get("DEBUG_CONSOLE_LOGS") === true) { console.log(str, 1); }
		if(webapis.adframework.config.get("DEBUG_ALERTS") === true) { console.log(str, 1); }
		webapis.adframework.events.dispatch(webapis.adframework.events.DEBUG_MESSAGE, { message: str});
	};
	Obj.prototype.error = function(str) { this.log("[ERROR] " + str); };	
	
	/**
	* @fn		toString
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.toString 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.toString = function() {
		var str = "BreakInfo";
		str += "\n\t offset=" + this.getOffset().toString();
		str += "\n\t breakType=" + this._breakType;
		str += "\n\t ads=" + this.getAds().length;
		str += "\n\t breakID=" + this._breakID;
		str += "\n\t played=" + this.isPlayed();
		return str;
	};
	return Obj;
})();

if(typeof Object.freeze === "function") {
	Object.freeze(webapis.adframework.BreakInfo);
}

/*
webapis.adframework.Creative
An abstract class that represents a creative.
Creatives must be instantiated as one of LinearCreative, NonLinearCreative, CompanionCreative
Please see the individual Creative type definitions for instantiation and API
*/

if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}
/**
 * @brief Creative Model.
 * @details A BluePrint of Creative Model
 * @return Null
 */
webapis.adframework.Creative = (function() {
	"use strict";
	var Obj = function(options) {
		this.id = options.id;
		
		if(options.sequence) {
			try { 
				this.sequence = parseInt(options.sequence);
				if(isNaN(this.sequence)) {
					this.sequence = null;
				}
			}
			catch(e) { 
				this.sequence = null; 
			}
		}
		
		this.adID = options.adID;
		this.apiFramework = options.apiFramework;
		this.adParameters = options.adParameters;
		this.eventTrackers = options.eventTrackers || [];
		
		this.sanityCheck();
	};
	
	//Merges a hashmap full of stuff into this Creative. If there is a conflict, it favors this creative as opposed to what's passed in.
	//This is made to help with merging Wrapper ads.
	/**
	* @fn		merge
	* @brief	
	*
	* @param[in]/[out]	: options
	* @return			: void
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.merge = function(options) {
		this.id = this.id || options.id;
		this.adID = this.adID || options.adID;
		this.apiFramework = this.apiFramework || options.apiFramework;
		this.sequence = this.sequence || options.sequence;
		if(options.eventTrackers && options.eventTrackers.length) {
			this.eventTrackers = this.eventTrackers.concat(options.eventTrackers);
		}
		
		this.sanityCheck();
	};
	
	/**
	* @fn		handleEvent
	* @brief	
	*
	* @param[in]/[out]	: id
	*					: adPlayhead
	*					: adDuration
	*					: contentPlayhead
	*					: adAssetURI
	* @return			: Obj.prototype.handleEvent =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleEvent = function(id, adPlayhead, adDuration, contentPlayhead, adAssetURI) {
		this.eventTrackers.forEach(function(tracker) {
			if(tracker.shouldFire(id, adPlayhead, adDuration)) {
				tracker.fireTracker(contentPlayhead, adAssetURI);
			}
		});
	};
	/**
	* @fn		resetEventTrackers
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.resetEventTrackers =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.resetEventTrackers = function() {
		this.eventTrackers.forEach(function(tracker) {
			tracker.resetFired();
		});
	};
	
	
	/**
	* @fn		handleVPAIDEvent
	* @brief	
	*
	* @param[in]/[out]	: id
	*					: adPlayhead
	*					: adDuration
	*					: contentPlayhead
	*					: adAssetURI
	* @return			: Obj.prototype.handleEvent =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleVPAIDEvent = function(id, adPlayhead, adDuration, contentPlayhead, adAssetURI) {
		this.eventTrackers.forEach(function(tracker) {
			if(id.toLowerCase().trim()=== tracker.id)	{
				tracker.fireTracker(contentPlayhead, adAssetURI);
			}
		});
	};
	
	/**
	* @fn		handleProgress
	* @brief	
	*
	* @param[in]/[out]	: id
	*					: adPlayhead
	*					: adDuration
	*					: contentPlayhead
	*					: adAssetURI
	* @return			: Obj.prototype.handleProgress =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleProgress = function(id, adPlayhead, adDuration, contentPlayhead, adAssetURI) {
		this.handleEvent("progress", adPlayhead, adDuration, contentPlayhead, adAssetURI);
		this.handleEvent("creativeView", adPlayhead, adDuration, contentPlayhead, adAssetURI);
		this.handleEvent("start", adPlayhead, adDuration, contentPlayhead, adAssetURI);
	};
	
	//Makes sure internal state is how it should be - used after a merge
	/**
	* @fn		sanityCheck
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.sanityCheck =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.sanityCheck = function() {
		if(this.sequence) {
			try{ 
				this.sequence = parseInt(this.sequence); 
			} 
			catch(e){ 
				this.sequence = null; 
			} 
		}
		this.eventTrackers = this.eventTrackers || [];
	};
	
	return Obj;
})();
/**
 * @brief LinearCreative Model.
 * @details A BluePrint of LinearCreative Model
 * @return Null
 */
webapis.adframework.LinearCreative = (function() {
	"use strict";
	var parent = webapis.adframework.Creative;
	
	var Obj = function(options) {
		parent.call(this, options);
		this.duration = parseInt(options.duration);
		this.mediaFiles = options.mediaFiles;
		this.icons = options.icons;
		this.clickTrackers = options.clickTrackers;
		this.clickThrough = options.clickThrough;
		
		if(typeof options.skipOffset === "string") {
			this.skipOffset = new webapis.adframework.Offset(options.skipOffset);
		}
		else {
			this.skipOffset = null;
		}

	};
	Obj.prototype = Object.create(webapis.adframework.Creative.prototype);
	Obj.constructor = Obj;
	
	/**
	* @fn		merge
	* @brief	
	*
	* @param[in]/[out]	: options
	* @return			: Obj.prototype.merge =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.merge = function(options) {
		parent.prototype.merge.call(this, options);
		if(options.videoClicks) {
			//TODO: Videoclicks
				; /*NULL*/
		}
	};

	/**
	* @fn		getClickThrough
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getClickThrough =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getClickThrough = function() {
		if(this.clickThrough && this.clickThrough.length > 1) {
			return this.clickThrough;
		}
		else {
			return null;
		}
	};
	
	//Handles tracking events for a click on the video
	/**
	* @fn		handleClick
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.handleClick =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleClick = function() {
		if(!this.clickTrackers) { 
			return; 
		}
		for(var i = 0; i < this.clickTrackers.length; i++) {
			var playhead = 0;
			try {
				playhead = webapis.adframework.ContentManager.getState().currentContentPlayhead();
			}
			catch(e) {
					; /*NULL*/
			}
			this.clickTrackers[i].fireTracker(playhead, this.getOptimalMediaFile().getURL());
		}
	};
	
	//Picks the best linear media file to play.
	/**
	* @fn		getOptimalMediaFile
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getOptimalMediaFile =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getOptimalMediaFile = function() {
		
		if(!this._optimalMediaFile) {
			var hlsStream = null;
			var smoothStream = null;
			var dashStream = null;
			var progressives = [];
			
			for(var i = 0; i < this.mediaFiles.length; i++) {
				var type = this.mediaFiles[i].getType();
				if(type === webapis.adframework.LinearMediaFile.Types.PROGRESSIVE) { 
					progressives.push(this.mediaFiles[i]); 
				}
				else if(type === webapis.adframework.LinearMediaFile.Types.SMOOTH) {
					smoothStream = this.mediaFiles[i]; 
				}
				else if(type === webapis.adframework.LinearMediaFile.Types.DASH) {
					dashStream = this.mediaFiles[i]; 
				}
				else if(type === webapis.adframework.LinearMediaFile.Types.HLS) { 
					hlsStream = this.mediaFiles[i]; 
				}
				else {
					;/*NULL*/
				}
			}
			
			if(smoothStream) { 
				this._optimalMediaFile = smoothStream; 
			}
			else if(dashStream) { 
				this._optimalMediaFile = dashStream; 
			}
			else if(hlsStream) { 
				this._optimalMediaFile = hlsStream; 
			}
			else if(progressives) {
				for(var x = 0; x < progressives.length; x++) {
					if(!this._optimalMediaFile) {
						this._optimalMediaFile = progressives[x];
					}
					else {
						if((isAVIMIME(progressives[x].getMIMEType()) || isMP4MIME(progressives[x].getMIMEType())) && !(isAVIMIME(this._optimalMediaFile) || isMP4MIME(this._optimalMediaFile))) {
							//AVI or MP4 would be better
							this._optimalMediaFile = progressives[x];
						}
						else if(progressives[x].width > this._optimalMediaFile.width) {
							//Larger would be better
							this._optimalMediaFile = progressives[x];
						}
						else if(progressives[x].getBitrate() > this._optimalMediaFile.getBitrate()) {
							//Higher bitrate would be better (if our network is constrained, well too bad, we can't calculate the bitrate)
							this._optimalMediaFile = progressives[x];
						}
						else {
							;/*NULL*/
						}
					}
				}

			}
			else {
				;/*NULL*/
			}
		}
		return this._optimalMediaFile;
		
	};
	
	//Picks the best linear industry icons.
	/**
	* @fn		getIcons
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getIcons =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getIcons = function() {
		return this.icons;
	};
	
	/**
	* @fn		isSkippable
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isSkippable =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isSkippable = function() {
		if(this.skipOffset && this.skipOffset instanceof webapis.adframework.Offset) {
			return true;
		}
		else {
			return false;
		}
	};
	
	/**
	* @fn		canSkipNow
	* @brief	
	*
	* @param[in]/[out]	: contentPlayhead
	*					: contentDuration
	* @return			: Obj.prototype.canSkipNow =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.canSkipNow = function(contentPlayhead, contentDuration) {
		if(this.isSkippable() && (typeof contentDuration === "number" && contentDuration > 0) && (typeof contentPlayhead === "number" && contentPlayhead > 0) && this.skipOffset.test(contentPlayhead, contentDuration)) {
			return true;
		}
		else {
			return false;
		}
	};
	
	/**
	* @fn		handleSkip
	* @brief	
	*
	* @param[in]/[out]	: contentPlayhead
	*					: adAssetURI
	* @return			: Obj.prototype.handleSkip =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleSkip = function(contentPlayhead, adAssetURI) {
		this.handleEvent("skip", null, null, contentPlayhead, adAssetURI);
	};

	/**
	* @fn		getDuration
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getDuration =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getDuration = function() {
		return this.duration;
	};
	
	/**
	* @fn		getSkipMS
	* @brief	
	*
	* @param[in]/[out]	: contentPlayhead
	*					: contentDuration
	* @return			: Obj.prototype.getSkipMS =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getSkipMS = function(contentPlayhead, contentDuration) {
		if(this.skipOffset) {
			var skipMS = this.skipOffset.getTriggerMS(contentPlayhead, contentDuration);
			return skipMS;
		}
		else {
			return null;
		}
	};
	
	/**
	* @fn		toString
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.toString =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.toString = function() {
		var str = "LinearCreative";
		str += "\n\t adID=" + this.adID;
		str += "\n\t id=" + this.id;
		str += "\n\t sequence=" + this.sequence;
		str += "\n\t adID=" + this.adID;
		str += "\n\t apiFramework=" + this.apiFramework;
		str += "\n\t eventTrackers=" + this.eventTrackers.length;
		str += "\n\t clickThrough=" + this.getClickThrough();
		str += "\n\t clickTrackingURLs=" + this.clickTrackers.length;
		str += "\n\t duration=" + this.duration;
		str += "\n\t mediaFiles=" + this.mediaFiles.length;
		str += "\n\t icons=" + this.icons;
		str += "\n\t skipoffset=" + this.skipOffset;
		
		return str;
	};
	
	return Obj;
})();

webapis.adframework.NonLinearCreative = (function() {
	"use strict";
	var Obj = function(options) {
		webapis.adframework.Creative.call(this, options);
		this.variations = options.variations;
	};
	Obj.prototype = Object.create(webapis.adframework.Creative.prototype);
	Obj.constructor = Obj;

	Obj.prototype.toString = function() {
		var str = "NonLinearCreative";
		str += "\n\t adID=" + this.adID;
		str += "\n\t id=" + this.id;
		str += "\n\t sequence=" + this.sequence;
		str += "\n\t adID=" + this.adID;
		str += "\n\t apiFramework=" + this.apiFramework;
		str += "\n\t eventTrackers=" + this.eventTrackers.length;

		str += "\n\t variations=" + this.variations.length;

		return str;
	};

	//Gets the best variation available
	Obj.prototype.getBestVariation = function() {
		this.variations.sort(webapis.adframework.NonLinearVariation.Sort);
		this.bestVariation = this.variations[0];
		return this.bestVariation;
	};

	return Obj;
})();

/**
 * @brief CompanionCreative Model.
 * @details A BluePrint of CompanionCreative Model
 * @return Null
 */
//TODO: Support CompanionAds
webapis.adframework.CompanionCreative = (function() {
	"use strict";
	var Obj = function(options) {
		webapis.adframework.Creative.call(this, options);
                this.companions = options.companions;
                this.required = options.required; //[all,any,none] Companions Ad should be displayed
	};
	
	Obj.prototype = Object.create(webapis.adframework.Creative.prototype);
	Obj.constructor = Obj;
	
	/**
	* @fn		toString
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.toString =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.toString = function() {
        var str = "CompanionCreative";
        str += "\n\t adID=" + this.adID;
        str += "\n\t id=" + this.id;
        str += "\n\t sequence=" + this.sequence;
        str += "\n\t apiFramework=" + this.apiFramework;
        str += "\n\t eventTrackers=" + this.eventTrackers.length;
        str += "\n\t companions=" + this.companions.length;
        str += "\n\t required=" + this.required;
        return str;
    };

	/**
	* @fn		getRequired
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getRequired =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getRequired = function() {
        return this.required;
    };

	return Obj;
})();

if(typeof Object.freeze === "function") { 
	Object.freeze(webapis.adframework.Creative);
}

if(typeof Object.freeze === "function") { 
	Object.freeze(webapis.adframework.LinearCreative);
}

if (typeof Object.freeze === "function") {
    Object.freeze(webapis.adframework.NonLinearCreative);
}

if(typeof Object.freeze === "function") { 
	Object.freeze(webapis.adframework.CompanionCreative);
}
//This file enumerates all of the error codes possible in the V-Suite standards and their meanings.
(function(){
	"use strict";
	if(typeof window.webapis.adframework !== "object") { 
		window.webapis.adframework = {}; 
	}
	
	webapis.adframework.Errors = new webapis.adframework.GenericEventDispatcher();
	var errors = {
		
		//Framework Defined Errors
		1	: "",
		2	: "",
		3	: "",
		4	: "",
		5	: "",
		6	: "",
		7	: "",
		8	: "",
		9	: "",
		10	: "",
		11	: "",
		12	: "",
		13	: "",
		14	: "",
		15	: "",
		16	: "",
		17	: "",
		18	: "",
		19	: "",
		20	: "",
		21	: "",
		22	: "",
		23	: "",
		24	: "",
		25	: "",
		26	: "",
		27	: "",
		28	: "",
		29	: "",
			
		//V-SUITE Defined errors
		100 : "XML parsing error",
	    101 : "VAST schema validation error",
	    102 : "VAST version of response not supported",
	    300 : "General Wrapper error",
	    301 : "Timeout of VAST URI provided in Wrapper element, or of VAST URI provided in a subsequent Wrapper element. (URI was either unavailable or reached a timeout as defined by the video player.)",
	    302 : "Wrapper limit reached, as defined by the video player. Too many Wrapper responses have been received with no InLine response",
	    303 : "No Ads VAST response after one or more Wrappers",
	    1000 : "VMAP schema error",
	    1001 : "VMAP version of response not supported",
	    1002 : "VMAP parsing error",
	    1004 : "General ad response document error",
	    1005 : "Ad response template type not supported",
	    1006 : "Ad response document extraction or parsing error",
	    1007 : "Ad response document retrieval timeout",
	    1008 : "Ad response document retrieval error (e.g., HTTP server responded with error code)",
	    
		//Code 100+: V-SUITE Playback errors
	    200 : "Trafficking error. Video player received an Ad type that it was not expecting and/or cannot display",
	    201 : "Video player expecting different linearity",
	    202 : "Video player expecting different duration",
	    203 : "Video player expecting different size",
	    400 : "General Linear error. Video player is unable to display the Linear Ad",
	    401 : "File not found. Unable to find Linear/MediaFile from URI",
	    402 : "Timeout of MediaFile URI",
	    403 : "Couldn't find MediaFile that is supported by this video player, based on the attributes of the MediaFile element",
	    405 : "Problem displaying MediaFile. Video player found a MediaFile with supported type but couldn't display it. MediaFile may include: unsupported codecs, different MIME type than MediaFile@type, unsupported delivery method, etc",
	    500 : "General NonLinearAds error",
	    501 : "Unable to display NonLinear Ad because creative dimensions do not align with creative display area (i.e. creative dimension too large)",
	    502 : "Unable to fetch NonLinearAds/NonLinear resource",
	    503 : "Couldn't find NonLinear resource with supported type",
	    600 : "General CompanionAds error",
	    601 : "Unable to display Companion because creative dimensions do not fit within Companion display area (i.e., no available space)",
	    602 : "Unable to display Required Companion",
	    603 : "Unable to fetch CompanionAds/Companion resource",
	    604 : "Couldn't find Companion resource with supported type",
	    900 : "Undefined Error",
	    901 : "General VPAID error",
	    902: "VPAID Disabled",

	    //Code 1000+: VMAP Errors
	    1003 : "AdBreak type not supported"
	    
	};
	for(var key in errors) {
		if(errors.hasOwnProperty(key)) {
			webapis.adframework.Errors[key] = errors[key];
		}
	}
	if(typeof Object.freeze === "function") { 
		Object.freeze(webapis.adframework.Errors);
	} //Freeze this object so it cannot be modified
}());

/*
LinearMediaFile - just a container class for a VAST Linear MediaFile. All it does is contain information, no logic.
*/

if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}
/**
 * @brief LinearMediaFile Model.
 * @details A BluePrint of LinearMediaFile Model
 * @return Null
 */
webapis.adframework.LinearMediaFile = (function() {
	"use strict";
	var Obj = function(options) {
		
		//Required variables
		this._url = options.url;
		this._fixedURL = options.url;
		this._urlPostfix = "";
		this.mimeType = options.type;
		this.width = options.width;
		this.height = options.height;
		
		this.delivery = options.delivery ? options.delivery.toLowerCase() : null; //This String should be either "PROGRESSIVE" or "STREAMING"
		if(this.delivery !== 'progressive' && this.delivery !== 'streaming') {
			this.delivery = null;
		}
		
		if(webapis.adframework.utils.isFlashMIME(this.mimeType)) {
			this._type = Obj.Types.FLASH;
		}

		else if(this.delivery === "progressive") {
			this._type = Obj.Types.PROGRESSIVE;
		}
		else {
		
			if(webapis.adframework.utils.isSmoothMIME(this.mimeType) || webapis.adframework.utils.isXMLMIME(this.mimeType)) {
				this._type = Obj.Types.SMOOTH;
				this._urlPostfix = "|COMPONENT=SMOOTH";
				this._fixedURL += this._urlPostfix;
			}
			else if(webapis.adframework.utils.isHLSMIME(this.mimeType)) {
				this._type = Obj.Types.HLS;
				this._urlPostfix = "|COMPONENT=HLS";
				this._fixedURL += this._urlPostfix;
			}
			else if(webapis.adframework.utils.isDASHMIME(this.mimeType)) {
				this._type = Obj.Types.DASH;
				this._urlPostfix = "|COMPONENT=HAS";
				this._fixedURL += this._urlPostfix;
			}
			else {
				;/*NULL*/
			}
		}
		
		//Variables required for linear skip
		if(typeof options.skipoffset === "string") {
			this.skipoffset = new webapis.adframework.Offset(options.skipoffset);
		}
		else {
			this.skipoffset = null;
		}
		
		//Optional variables
		this.scalable = options.scalable;
		this.bitrate = parseInt(options.bitrate);
		this.maxBitrate = parseInt(options.maxBitrate);
		this.minBitrate = parseInt(options.minBitrate);
		this.codec = options.codec;
		this.apiFramework = options.apiFramework;
		this.maintainAspectRatio = options.maintainAspectRatio;
	};

	Obj.Types = {
		PROGRESSIVE: "PROGRESSIVE",
		HLS: "HLS",
		SMOOTH: "SMOOTH",
		DASH: "DASH",
		FLASH: "FLASH"
	};
	
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj.Types);
	} //Freeze this definition

	/**
	* @fn		getBitrate
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getBitrate =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getBitrate = function() {
		if(this.bitrate) {
			return this.bitrate;
		}
		else if(this.maxBitrate && this.minBitrate) {
			try {
				return (this.maxBitrate + this.minBitrate)/2;
			}
			catch(e) {
				; /*NULL*/
			}
		}
		else {
			;/*NULL*/
		}
		return null;
	};
	
	/**
	* @fn		getMIMEType
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getMIMEType =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getMIMEType = function() {
		return this.mimeType;
	};
	
	/**
	* @fn		getURL
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getURL =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getURL = function() {
		return this._url;
	};
	
	/**
	* @fn		getURLPostfix
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getURLPostfix =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getURLPostfix = function() {
		return this._urlPostfix;
	};
	/**
	* @fn		getFixedURL
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getFixedURL =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getFixedURL = function() {
		return this._fixedURL;
	};
	
	/**
	* @fn		isHLS
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isHLS =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isHLS = function() {
		return this.getType() === Obj.Types.HLS;
	};
	/**
	* @fn		isSmooth
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isSmooth =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isSmooth = function() {
		return this.getType() === Obj.Types.SMOOTH;
	};
	
	/**
	* @fn		isDASH
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isDASH =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isDASH = function() {
		return this.getType() === Obj.Types.DASH;
	};
	
	/**
	* @fn		isProgressive
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isProgressive =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isProgressive = function() {
		return this.getType() === Obj.Types.PROGRESSIVE;
	};
	
	/**
	* @fn		isJavaScript
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isJavaScript =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isJavaScript = function() {
		return webapis.adframework.utils.isJSMIME(this.mimeType);
	};
	
	/**
	* @fn		getType
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getType =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getType = function() {
		return this._type;
	};
	
	/**
	* @fn		toString
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.toString =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.toString = function() {
		var str = "Linear Media File";
		str += "\n\t url=" + this._url;
		str += "\n\t type=" + this.getType();
		str += "\n\t mime=" + this.getMIMEType();
		str += "\n\t width=" + this.width;
		str += "\n\t height=" + this.height;
		str += "\n\t delivery=" + this.delivery;
		str += "\n\t skipoffset=" + this.skipoffset;
		str += "\n\t scalable=" + this.scalable;
		str += "\n\t bitrate=" + this.bitrate;
		str += "\n\t maxBitrate=" + this.maxBitrate;
		str += "\n\t minBitrate=" + this.minBitrate;
		str += "\n\t codec=" + this.codec;
		str += "\n\t apiFramework=" + this.apiFramework;
		str += "\n\t maintainAspectRatio=" + this.maintainAspectRatio;
		
		return str;
	};
	
	return Obj;
})();

if(typeof Object.freeze === "function") { 
	Object.freeze(webapis.adframework.LinearMediaFile);
}

if(typeof window.webapis.adframework !== "object") {
	window.webapis.adframework = {};
}
/**
 * @brief Offset Model.
 * @details A BluePrint of Offset Model
 * @return Null
 */
webapis.adframework.Offset = (function() {
	"use strict";
	var flatTimeOffsetRegex = /\s*(\d+):(\d+):(\d+):?(\d+)?\s*/;
	var percentageOffsetRegex = /\s*(\d+)%\s*/;
	
	var Obj = function(offset) {
		if(typeof offset === "number") {
			offset = webapis.adframework.utils.getTimeString(offset);
		}
		this.startCondition = [];
		this.endCondition = [];
		this.initializeOffsetString(offset);
	};
	
	Obj.OffsetType = {
		STATIC_OFFSET_START : "STATIC_OFFSET_START",
		STATIC_OFFSET_END 	: "STATIC_OFFSET_END",
		PERCENTAGE_OFFSET 	: "PERCENTAGE_OFFSET",
		MILLISECOND_OFFSET 	: "MILLISECOND_OFFSET",
		CONDITIONAL_OFFSET 	: "CONDITIONAL_OFFSET",// by amit tyagi
		NONE				: "NONE"
	};
	
	if(typeof Object.freeze === "function") {
		Object.freeze(Obj.OffsetType);
	} //Freeze this definition
	
	/**
	* @fn		getType
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getType =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getType = function() {
		return this.type;
	};
	
	/**
	* @fn		getOffsetProp
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getOffsetProp =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getOffsetProp = function() {
		return this.offset;
	};
	
	/**
	* @fn		getStartCondition
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getStartCondition =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getStartCondition = function() {
		return this.startCondition;
	};
	
	/**
	* @fn		getEndCondition
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getEndCondition =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getEndCondition = function() {
		return this.endCondition;
	};
	
	/**
	* @fn		initializeOffsetString
	* @brief	
	*
	* @param[in]/[out]	: offset
	* @return			: Obj.prototype.initializeOffsetString =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initializeOffsetString = function(offset) {
		
		//Parse the time offset as HH:MM:SS.mmm.
		if(offset.startCondition || offset.endCondition){
			this.type = Obj.OffsetType.CONDITIONAL_OFFSET;
			this.startCondition = offset.startCondition;
			this.endCondition = offset.endCondition;
		}
		else if(flatTimeOffsetRegex.test(offset)) {
			var ms = webapis.adframework.utils.getTimeInt(offset); //TODO: Change this to use webapis.adframework.utils, and then afterward check Creative to see if you can skip, then edit Player
			this.type = Obj.OffsetType.MILLISECOND_OFFSET;
			this.offset = ms;
		}
		else if(percentageOffsetRegex.test(offset)) {
			var timeArray = percentageOffsetRegex.exec(offset);
			var percentage = timeArray[1];
			this.type = Obj.OffsetType.PERCENTAGE_OFFSET;
			this.offset = percentage;
		}
		else if(offset.toLowerCase().trim() === "start") {
			this.type = Obj.OffsetType.STATIC_OFFSET_START;
			this.offset = "start";
		}
		else if(offset.toLowerCase().trim() === "end") {
			this.type = Obj.OffsetType.STATIC_OFFSET_END;
			this.offset = "end";
		}
		else {
			throw("Unrecognized time offset format: " + offset);
		}
	};
	
	//Given a Playhead and Duration, returns whether or not the offset has been passed (true if offset should trigger, false if not)
	/**
	* @fn		test
	* @brief	
	*
	* @param[in]/[out]	: playhead
	*					: duration
	* @return			: Obj.prototype.test =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.test = function(playhead, duration) {
		var playheadPercentage = 0;
		
		if(this.getType() === Obj.OffsetType.MILLISECOND_OFFSET) {
			return(playhead >= this.offset); 
		}
		else if(this.getType() === Obj.OffsetType.PERCENTAGE_OFFSET) {
			//It's a percentage offset
			playheadPercentage = ((playhead/duration)*100);
			return (playheadPercentage >= this.offset);
		}
		//For the static offsets, you actually should have the player decide when to fire. The offset can't decide for itself based on just the playhead and duration (especially for 'end', you need to know that the OnRenderingComplete event has fired.
		//But just in case someone goofs it up, the functionality is provided.
		else if(this.getType() === Obj.OffsetType.STATIC_OFFSET_START) {
			webapis.adframework.utils.error("WARNING: Offset.test() called on static offset [START]. You should have the Player determine whether or not this offset should fire. Returning best guess.");
			return true;
		}
		else if(this.getType() === Obj.OffsetType.STATIC_OFFSET_END) {
			webapis.adframework.utils.error("WARNING: Offset.test() called on static offset [END]. You should have the Player determine whether or not this offset should fire. Returning best guess.");
			playheadPercentage = ((playhead/duration)*100);
			return (playheadPercentage >= 98);
		}
		else {
			;/*NULL*/
		}
	};

	//Given a Playhead and Duration, returns the Milliseconds value at which this offset can trigger. (Playhead and duration are needed in the case of a percentage or END offset)
	/**
	* @fn		getTriggerMS
	* @brief	
	*
	* @param[in]/[out]	: playhead
	*					: duration
	* @return			: Obj.prototype.getTriggerMS =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getTriggerMS = function(playhead, duration) {
		if(this.getType() === Obj.OffsetType.MILLISECOND_OFFSET) {
			return this.offset;
		}
		else if(this.getType() === Obj.OffsetType.PERCENTAGE_OFFSET) {
			return ((this.offset/100) * duration);
		}
		else if(this.getType() === Obj.OffsetType.STATIC_OFFSET_START) {
			return 0;
		}
		else if(this.getType() === Obj.OffsetType.STATIC_OFFSET_END) {
			return duration;
		}
		else {
			;/*NULL*/
		}
	};
	
	/**
	* @fn		toString
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.toString =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.toString = function() {
		if(this.getType() === Obj.OffsetType.MILLISECOND_OFFSET) {
			return this.offset + " ms";
		}
		else if(this.getType() === Obj.OffsetType.PERCENTAGE_OFFSET) {
			return this.offset + "%";
		}
		else if(this.getType() === Obj.OffsetType.STATIC_OFFSET_START) {
			return this.offset;
		}
		else if(this.getType() === Obj.OffsetType.STATIC_OFFSET_END) {
			return this.offset;
		}
		else {
			;/*NULL*/
		}
	};

	return Obj;
})();

if(typeof Object.freeze === "function") {
	Object.freeze(webapis.adframework.Offset);
}


if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}
/**
 * @brief Tracker Model.
 * @details A BluePrint of Tracker Model
 * @return Null
 */
webapis.adframework.Tracker = (function() {
	"use strict";
	var Obj = function(id, url) {
		if(!id) { 
			id = ""; 
		}
		if(!url) { 
			url = ""; 
		}
        this.id = id.toLowerCase();
        this.url = url;
        this.fired = false;
	};
	
	//Add a callback function to execute when this tracker is fired
	/**
	* @fn		setCallback
	* @brief	
	*
	* @param[in]/[out]	: fn
	* @return			: Obj.prototype.setCallback =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setCallback = function(fn) {
		this.onfire = fn;
	};
	
	//Fire the tracker's URL. Needs contentPlayhead, adAssetURI to replace macros.
	/**
	* @fn		fireTracker
	* @brief	
	*
	* @param[in]/[out]	: contentPlayhead
	*					: adAssetURI
	* @return			: Obj.prototype.fireTracker =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.fireTracker = function(contentPlayhead, adAssetURI) {
		this.fired = true;
		if(this.getURL() && this.getURL().length > 1) {
			var processedURL = webapis.adframework.MacroHelper.replaceTrackingMacros(this.getURL(), contentPlayhead, adAssetURI);
			webapis.adframework.utils.fireTrackerURL(processedURL);
			webapis.adframework.events.dispatch(webapis.adframework.events.TRACKING_EVENT, { event: this.getID() , url: processedURL });
		}
    	if(typeof this.onfire === "function") {
			this.onfire();
		} //This adds the possibility of utilizing trackers for internal functionality
    };
    
    //Returns whether this tracker should fire or not. Playhead and duration aren't necessary unless using the OffsetTracker subclass.
	/**
	* @fn		shouldFire
	* @brief	
	*
	* @param[in]/[out]	: id
	*					: playhead
	*					: duration
	* @return			: Obj.prototype.shouldFire =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.shouldFire = function(id, playhead, duration) {
		playhead = 0;
		duration = 0;
		if(!id) {
			return false; 
		}
		else if((id.toLowerCase().trim()!==this.id)) {
			return false;
		}
		else {
			return true;
		}
		
	};
	
	/**
	* @fn		getID
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getID =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getID = function() {
		return this.id;
	};
	/**
	* @fn		getID
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getURL =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getURL = function() {
		return this.url;
	};
	/**
	* @fn		isFired
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isFired =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isFired = function() {
		return this.fired;
	};
	/**
	* @fn		resetFired
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.resetFired =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.resetFired = function() {
		this.fired = false;
	};
	
	
	/**
	* @fn		toString
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.toString =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.toString = function() {
		var str = "Tracker";
		str += "\n\t id=" + this.id;
		str += "\n\t url=" + this.url;
		str += "\n\t fired=" + this.fired;
		return str;
	};
	return Obj;
}());
/**
 * @brief OneTimeTracker Model.
 * @details A BluePrint of OneTimeTracker Model
 * @return Null
 */
//A "One Time Tracker" may only be fired once (as opposed to many times)
webapis.adframework.OneTimeTracker = (function() {
	"use strict";
	var Obj = function(id, url) {
		webapis.adframework.Tracker.call(this, id, url, true);
	};
	Obj.prototype = Object.create(webapis.adframework.Tracker.prototype);
	Obj.constructor = Obj;
	
	//Given a AdPlayhead and AdDuration, determines whether this tracker should fire. The ID is irrelevant for an OffsetTracker, but we need it anyway because the parent class Tracker uses it.
	/**
	* @fn		shouldFire
	* @brief	
	*
	* @param[in]/[out]	: id
	*					: playhead
	*					: duration
	* @return			: Obj.prototype.shouldFire =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.shouldFire = function(id, playhead, duration) {
		playhead = 0;
		duration = 0;
		if(!id) {
			return false; 
		}
		
		if(this.isFired()) {
			return false;
		}
		
		else if((id.toLowerCase().trim()!==this.id)) {
			return false;
		}
		else {
			return true;
		}
	};
	
	/**
	* @fn		toString
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.toString =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.toString = function() {
		var str = "OneTimeTracker";
		str += "\n\t id=" + this.id;
		str += "\n\t url=" + this.url;
		str += "\n\t fired=" + this.fired;
		return str;
	};
	return Obj;
}());

//Progress trackers fire not because of a specific event, but by a time offset.
//Compatible trackers are: progress, firstQuartile, midpoint, thirdQuartile
/**
 * @brief OffsetTracker Model.
 * @details A BluePrint of OffsetTracker Model
 * @return Null
 */
webapis.adframework.OffsetTracker = (function() {
	"use strict";
	var Obj = function(id, url, progressOffset) {
		if(!progressOffset) {
			throw("Failed to create Progress Tracker: Missing progress offset");
		}
		this.progressOffset = new webapis.adframework.Offset(progressOffset);
		webapis.adframework.Tracker.call(this, id, url, true);
	};
	
	Obj.prototype = Object.create(webapis.adframework.Tracker.prototype);
	Obj.constructor = Obj;
	Obj.prototype.getOffset = function() {
		return this.progressOffset;
	};
	
	//Given a AdPlayhead and AdDuration, determines whether this tracker should fire. The ID is irrelevant for an OffsetTracker, but we need it anyway because the parent class Tracker uses it.
	/**
	* @fn		shouldFire
	* @brief	
	*
	* @param[in]/[out]	: id
	*					: playhead
	*					: duration
	* @return			: Obj.prototype.shouldFire =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.shouldFire = function(id, playhead, duration) {
		if(this.isFired()) {
			return false;
		}
		var determination = this.getOffset().test(playhead, duration);
		return determination;
	};
	
	/**
	* @fn		toString
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.toString =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.toString = function() {
		var str = "OffsetTracker";
		str += "\n\t id=" + this.id;
		str += "\n\t url=" + this.url;
		str += "\n\t offset=" + this.progressOffset.originalOffsetString;
		str += "\n\t fired=" + this.fired;
		return str;
	};
	return Obj;
}());

if(typeof Object.freeze === "function") {
	Object.freeze(webapis.adframework.Tracker);
} 
 
if(typeof Object.freeze === "function") {
	Object.freeze(webapis.adframework.OneTimeTracker);
}
 
if(typeof Object.freeze === "function") {
	Object.freeze(webapis.adframework.OffsetTracker);
}

//A "Click Tracker" is fired whenever a creative is clicked.
/**
 * @brief ClickTracker Model.
 * @details A BluePrint of ClickTracker Model
 * @return Null
 */
webapis.adframework.ClickTracker = (function() {
	"use strict";
	var Obj = function(id, url) {
		webapis.adframework.Tracker.call(this, id, url, true);
	};
	Obj.prototype = Object.create(webapis.adframework.Tracker.prototype);
	Obj.constructor = Obj;
	
	//Given a AdPlayhead and AdDuration, determines whether this tracker should fire. The ID is irrelevant for an OffsetTracker, but we need it anyway because the parent class Tracker uses it.
	Obj.prototype.shouldFire = function() {
		return true;
	};
	
	Obj.prototype.toString = function() {
		var str = "ClickTracker";
		str += "\n\t id=" + this.id;
		str += "\n\t url=" + this.url;
		str += "\n\t fired=" + this.fired;
		return str;
	};
	return Obj;
}());

/**
 * @brief ErrorTracker Model.
 * @details A BluePrint of ErrorTracker Model
 * @return Null
 */
//Error trackers fire when something has gone wrong. 
webapis.adframework.ErrorTracker = (function() {
	"use strict";
	var Obj = function(url) {
		if(!url) {
			throw("Failed to create tracker: Missing tracker URL"); 
		}
		this.url = url; // by amit tyagi
	};
	/**
	* @fn		getURL
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getURL =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getURL = function() {
		return this.url;
	};
	/**
	* @fn		setCallback
	* @brief	
	*
	* @param[in]/[out]	: fn
	* @return			: Obj.prototype.setCallback =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setCallback = function(fn) {
		this.onfire = fn;
	};
	
	/**
	* @fn		fireError
	* @brief	
	*
	* @param[in]/[out]	: code
	*					: message
	*					: contentPlayhead
	*					: adAssetURI
	* @return			: Obj.prototype.fireError =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.fireError = function(code, message, contentPlayhead, adAssetURI) {
    	var processedURL = webapis.adframework.MacroHelper.replaceErrorMacros(this.getURL(), code, message, contentPlayhead, adAssetURI);
    	webapis.adframework.utils.fireTrackerURL(processedURL);
    	webapis.adframework.events.dispatch(webapis.adframework.events.ERROR_TRACKER, { code: code, message: message, url: processedURL });
		
    	if(typeof this.onfire === "function") {
			this.onfire();
		} //This adds the possibility of utilizing trackers for internal functionality
    };
	
	/**
	* @fn		toString
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.toString =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.toString = function() {
		var str = "ErrorTracker";
		str += "\n\t url=" + this.getURL();
		return str;
	};
	return Obj;
}());

if(typeof Object.freeze === "function") {
	Object.freeze(webapis.adframework.ErrorTracker);
}


if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}
/**
 * @brief Condition Model.
 * @details A BluePrint of Condition Model
 * @return Null
 */
webapis.adframework.Condition = (function() {
	"use strict";
	
	var flatTimeOffsetRegex = /\s*(?:(\d*):)?(\d*):(\d+)?\s*/;
	var percentageOffsetRegex = /\s*(\d+)%\s*/;

	var Obj = function(options) {
		
		//Required variables
		this.type = options.type;
		this.name = options.name;
		this.operator = options.operator;
		this._childCond = options.child_condition || [];
		this.setValue(options.value);
	};
	
	Obj.Operator = {
		EQUAL: "EQ",
		GREATERTHAN: "GTR",
		GREATEREQ: "GEQ",
		LESSTHAN: "LT",
		LESSEQ: "LEQ",
		MOD: "MOD",
		NOTEQUAL: "NEQ"
	};
	
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj.Operator);
	}
		
			
	Obj.ConditionType = {
	
		EVENT: "event",
		PROPERTY: "property"
	};
	
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj.ConditionType);
	}
	
	/**
	* @fn		getType
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Type 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getType = function() {
		return this.type;
	};
	/**
	* @fn		getValue
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Value
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getValue = function(duration) {
		
		var retVal = 0;
		
		if(this.valueType === webapis.adframework.Offset.OffsetType.PERCENTAGE_OFFSET && duration > 0) {
			retVal = ((this.value/100) * duration); 
		}
		else{
			retVal = this.value;
		}
		return retVal;
	};
	
	/**
	* @fn		getName
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Name
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getName = function() {
		return this.name;
	};
	/**
	* @fn		getOperator
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Operator
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getOperator = function() {
		return this.operator;
	};
	/**
	* @fn		getchildCond
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: childCond
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getChildCond = function() {
		return this._childCond;
	};
	/**
	* @fn		compareValue
	* @brief	
	*
	* @param[in]/[out]	: val
	* @return			: true or false
	* @warning			: None
	* @exception		: None
	* @see
	*/

	Obj.prototype.setValue = function(val) {

		if(flatTimeOffsetRegex.test(val)) {
			var ms = webapis.adframework.utils.getTimeInt(val); //TODO: Change this to use webapis.adframework.utils, and then afterward check Creative to see if you can skip, then edit Player
			this.value = ms;
			this.valueType = webapis.adframework.Offset.OffsetType.MILLISECOND_OFFSET;
		}
		else if(this.getName() === webapis.adframework.Scheduler.Property.Position && percentageOffsetRegex.test(val)) {
			var timeArray = percentageOffsetRegex.exec(val);
			var percentage = timeArray[1];
			this.value = percentage;
			this.valueType = webapis.adframework.Offset.OffsetType.PERCENTAGE_OFFSET;
		}
		else{
			this.value = val;
			this.valueType = webapis.adframework.Offset.OffsetType.NONE;
		}
	};

	
	Obj.prototype.compareValue = function(val, duration) {
		
		var a = val;
		var b = this.getValue(duration);
		var operator = this.getOperator();
		
		switch (operator) {
			case Obj.Operator.EQUAL:
				return (a === b);
			case Obj.Operator.GREATERTHAN:
				return (a > b);
			case Obj.Operator.GREATEREQ:
				return (a >= b);
			case Obj.Operator.LESSTHAN:
				return (a < b);
			case Obj.Operator.LESSEQ:
				return (a <= b);
			case Obj.Operator.MOD:
				return (a % b === 0);
			case Obj.Operator.NOTEQUAL:
				return (a !== b);
			default:
				//unsupported operator
				return 0;
		}		
	};
	
	return Obj;
})();

if(typeof Object.freeze === "function") { 
	Object.freeze(webapis.adframework.Condition);
}

if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}
webapis.adframework.Trigger = (function() {
	"use strict";
	var obj = function(options) {
		
		//Required variables
		this.ID = options.ID;
		this.desc = options.description;
		this._startCond = options.startcondition || [];
		this._endCond = options.endcondition || [];
		this._source = options.source || [];
	};
	
	/**
	* @fn		getID
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: obj.prototype.getID =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	obj.prototype.getID = function() {
		return this.ID;
	};

	/**
	* @fn		getDesc
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: obj.prototype.getDesc =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	obj.prototype.getDesc = function() {
		return this.description;
	};

	/**
	* @fn		getStartCond
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: obj.prototype.getStartCond =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	obj.prototype.getStartCond = function() {
		return this._startCond;
	};

	/**
	* @fn		getEndCond
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: obj.prototype.getEndCond =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	obj.prototype.getEndCond = function() {
		return this._endCond;
	};

	/**
	* @fn		getSource
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: obj.prototype.getSource =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	obj.prototype.getSource = function() {
		return this._source;
	};

	return obj;
})();
if(typeof Object.freeze === "function") { 
	Object.freeze(webapis.adframework.Trigger);
}


if(typeof window.webapis.adframework !== "object") {
	window.webapis.adframework = {}; 
}
/**
 * @brief Target Model.
 * @details A BluePrint of Target Model
 * @return Null
 */
webapis.adframework.Target = (function() {
	"use strict";
	var Obj = function(options) {
		//Required variables
		this.region = options.Region;
		this.type = options.Type;
		this._child_target = options.Child_Target || [];
	};
	

	/**
	* @fn		assign
	* @brief	
	*
	* @param[in]/[out]	: options
	* @return			: Obj.prototype.assign =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.assign = function(options) {

		this.region = options.Region;
		this.type = options.Type;
		this._child_target = options.Child_Target || [];

	};

	/**
	* @fn		getRegion
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getRegion =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getRegion = function() {
		return this.region;
	};

	/**
	* @fn		getTargetType
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getTargetType =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getTargetType = function() {
		return this.type;

	};
	

	return Obj;
})();

if(typeof Object.freeze === "function") {
	Object.freeze(webapis.adframework.Target);
}

/*
	webapis.adframework.NonLinearVariation
	Represents a <NonLinear> inside the <NonLinears> VAST tag.
*/
if(typeof window.webapis.adframework !== "object") {
	window.webapis.adframework = {}; 
}
webapis.adframework.NonLinearVariation = (function() {
	"use strict";
	var flatTimeOffsetRegex = /\s*(\d+):(\d+):(\d+):?(\d+)?\s*/;
	var Obj = function(options) {
	
		this.id = options.id;
		
		this.width = parseInt(options.width);
		this.height = parseInt(options.height);
		if(this.width === null || this.height === null || isNaN(this.width) || isNaN(this.height)) {
			throw "NonLinear Ad MUST specify width/height!"; 
		}
		
		this.expandedWidth = parseInt(options.expandedWidth); //Max allowable width
		this.expandedHeight = parseInt(options.expandedHeight); //Max allowable height
		if(this.expandedHeight === null ||  isNaN(this.expandedHeight)) {
			this.expandedWidth = null;
		}
		if(this.expandedHeight === null ||  isNaN(this.expandedHeight)) {
			this.expandedHeight = null;
		}
		
		//Are we allowed to scale this guy?
		if(typeof options.scalable === "string") {
			this.scalable = webapis.adframework.utils.parseBoolean(options.scalable);
		}
		else if(typeof options.scalable === "boolean") {
			this.scalable = options.scalable;
		}
		else {
			this.scalable = true;
		}
		
		//If we scale this guy, do we need to maintain aspect ratio?
		if(typeof options.maintainAspectRatio === "string") {
			this.maintainAspectRatio = webapis.adframework.utils.parseBoolean(options.maintainAspectRatio);
		}
		else if(typeof options.maintainAspectRatio === "boolean") {
			this.maintainAspectRatio = maintainAspectRatio.scalable;
		}
		else {
			this.maintainAspectRatio = true;
		}
		
		//Minimum suggested duration - convert to MS
		this.minSuggestedDuration = null;
		if(options.minSuggestedDuration) {
			if(typeof options.minSuggestedDuration === "number") {
				this.minSuggestedDuration = options.minSuggestedDuration;
			}
			else if(typeof options.minSuggestedDuration === "string") {
				this.minSuggestedDuration = webapis.adframework.utils.getTimeInt(options.minSuggestedDuration);
			}
			else {
				;/*NULL*/
			}
		}
		if(!this.minSuggestedDuration) { this.minSuggestedDuration = 0; }
		
		//The resources
		if(!options.resources) {
			throw "No NonLinear resources detected";
		}
		this.resources = options.resources;
		this.bestResource = null;
		
		//Clickthrough and clicktracking information
		this.clickThrough = options.clickThrough;
		this.clickTrackers = options.clickTrackers;
		
		//Ad Parameters for VPAID
		this.apiFramework = options.apiFramework;
		this.adParameters = options.adParameters;
	};
	Obj.SortByResourceType = function(a, b){
		if(a.apiFramework && a.apiFramework.toLowerCase() === "vpaid" && !b.apiFramework) { return -1; }
		if(b.apiFramework && b.apiFramework.toLowerCase() === "vpaid" && !a.apiFramework) { return 1; }
		
		//If there is an API Framework that is NOT VPAID, it gets last priority
		if(a.apiFramework && !b.apiFramework) { return 1; }
		if(b.apiFramework && !a.apiFramework) { return -1; }
		
		//Flash also always gets last priority
		if(a.getType() === webapis.adframework.NonLinearResource.ResourceType.STATIC_FLASH && b.getType() !== a.getType()) { return 1; }
		if(b.getType() === webapis.adframework.NonLinearResource.ResourceType.STATIC_FLASH && b.getType() !== a.getType()) { return -1; }
		
		//Static images get second priority because they're least prone to error
		if(a.getType() === webapis.adframework.NonLinearResource.ResourceType.STATIC_IMAGE && b.getType() !== a.getType()) { return -1; }
		if(b.getType() === webapis.adframework.NonLinearResource.ResourceType.STATIC_IMAGE && b.getType() !== a.getType()) { return 1; }
		return 0;
	};
	
	Obj.SortByHeight = function(a, b, playerHeight) {
		var ratioA = a.getHeight() / playerHeight;
		var ratioB = b.getHeight() / playerHeight;
		if(ratioB > 0.22 && ratioA <= 0.2) { return -1; } //If either is over 22%, prioritize the smaller
		if(ratioA > 0.22 && ratioB <= 0.2) { return 1; } //If either is over 22%, prioritize the smaller
		if(ratioA > 0.2 && ratioB > 0.2) { return (ratioA < ratioB) ? -1 : 1;  } //If A and B are over 20% height, return the smallest
		return (ratioA > ratioB) ? -1 : 1; //If none of the above apply, return the largest
	};
	Obj.SortByWidth = function(a, b, playerWidth) {
		if(a.getWidth() > playerWidth && b.getWidth() <= playerWidth) { return 1; } //If A is over and B is not, return B
		if(b.getWidth() > playerWidth && a.getWidth() <= playerWidth) { return -1; } //If B is over and A is not, return A
		if(a.getWidth() > playerWidth && b.getWidth() > playerWidth) { return (a.getWidth() < b.getWidth()) ? -1 : 1; } //If both are over, return the smaller
		return (a.getWidth() > b.getWidth()) ? -1 : 1;//If none of the above apply, return the largest
	};
	//Sort function
	Obj.Sort = function(a,b) {		
		//VPAID gets first priority because it is cool
		
		var ret = webapis.adframework.NonLinearVariation.SortByResourceType(a, b);
		if(ret === 0)
		{
		//If none of the above, then let's compare by dimensions.
		try {
			
			var playerDimensions = {
				x:0,
				y:0,
				w:1280,
				h:720
			};
			try {
				playerDimensions = webapis.adframework.ContentManager.getPlayer().getCorrectedDisplayArea();
			} catch (e) {
				;/*NULL*/
			}
			//I want the height to be as close to 20% of the player's dimensions as possible without going over that.
			if(a.getHeight() !== b.getHeight()) {
				var playerHeight = playerDimensions.h;
					ret = webapis.adframework.NonLinearVariation.SortByHeight(a, b, playerHeight);
					return ret;
			}
			//If the heights are equal, let's compare by width - the closest to the player's width without going over
			else if(a.getWidth() !== b.getWidth()) {
				var playerWidth = playerDimensions.w;
					ret = webapis.adframework.NonLinearVariation.SortByWidth(a, b, playerWidth);
					return ret;
					
			}
			//OK if we can't compare by height or width, let's try again with type priority:
			else {
				var ap = webapis.adframework.NonLinearResource.PriorityMap[a.getType()];
				var bp = webapis.adframework.NonLinearResource.PriorityMap[b.getType()];
				if(!bp) { return 1; }
				if(!ap) { return -1; }
				return ap - bp;
			}
		}
		catch(e) { 
			webapis.adframework.utils.error("error while sorting nonlinear: " + e);
			return 0;
		}
		}
		else {
			return ret;
		}
	};
	
	//On click, fire all click trackers
	Obj.prototype.handleClick = function() {
		if(!this.clickTrackers) { return; }
		for(var i = 0; i < this.clickTrackers.length; i++) {
			this.clickTrackers[i].fireTracker(webapis.adframework.core.getContentManager().getState().currentContentPlayhead(), this.getBestResource().getResource());
		}
	};
	
	//Calculates the proper display time of the nonlinear. It takes the larger of the minSuggestedDuration and default display time, but keeps it underneath the maximum.
	Obj.prototype.calculateDisplayTime = function() {
		var dur = this.getMinimumSuggestedDuration() || 0;
		if(flatTimeOffsetRegex.test(dur)) {
			dur = webapis.adframework.utils.getTimeInt(dur); //TODO: Change this to use webapis.adframework.utils, and then afterward check Creative to see if you can skip, then edit Player
		}
		var displayTime = Math.max(dur, webapis.adframework.config.get("NONLINEAR_DEFAULT_DISPLAY_TIME"));
		displayTime = Math.min(displayTime, webapis.adframework.config.get("NONLINEAR_MAXIMUM_DISPLAY_TIME"));
		return displayTime;
	};
	
	//Gets the best resource available to this variation
	Obj.prototype.getBestResource = function() {
		if(!this.bestResource) {
			this.resources.sort(webapis.adframework.NonLinearResource.Sort);
			this.bestResource = this.resources[0];
		}
		return this.bestResource;
	};
	
	Obj.prototype.isScalable = function() {
		return this.scalable;
	};
	
	Obj.prototype.shouldMaintainAspectRatio = function() {
		return this.maintainAspectRatio;
	};
	
	Obj.prototype.getMinimumSuggestedDuration = function() {
		return this.minSuggestedDuration || 0;
	};
	
	Obj.prototype.getWidth = function() {
		return this.width;
	};
	
	Obj.prototype.getHeight = function() {
		return this.height;
	};
	
	Obj.prototype.getExpandedWidth = function() {
		return this.expandedWidth;
	};
	
	Obj.prototype.getExpandedHeight = function() {
		return this.expandedHeight;
	};
	
	Obj.prototype.getType = function() {
		return this.getBestResource().type;
	};
	
	Obj.prototype.getClickThrough = function() {
		if(this.clickThrough && this.clickThrough.length > 1) {
			return this.clickThrough;
		}
		else {
			return null;
		}
	};
	
	Obj.prototype.toString = function() {
		var str = "NonLinearVariation";
		str += "\n\t width=" + this.getWidth();
		str += "\n\t height=" + this.getHeight();
		str += "\n\t expandedWidth=" + this.getExpandedWidth();
		str += "\n\t expandedHeight=" + this.getExpandedHeight();
		str += "\n\t scalable=" + this.isScalable();
		str += "\n\t maintainAspectRatio=" + this.shouldMaintainAspectRatio();
		str += "\n\t minSuggestedDuration=" + this.getMinimumSuggestedDuration();
		str += "\n\t resources=" + this.resources.length;
		str += "\n\t clickThrough=" + this.getClickThrough();
		str += "\n\t clickTrackingURLs=" + this.clickTrackers.length;
		str += "\n\t apiFramework=" + this.apiFramework;
		str += "\n\t adParameters=" + this.adParameters;
		
		return str;
	};
	
	return Obj;
})();


webapis.adframework.NonLinearResource = (function() {
	"use strict";
	var Obj = function(options) {
		this.resource = options.resource;
		this.type = options.type;
	};
	
	Obj.ResourceType = {
		STATIC_IMAGE: "STATIC_IMAGE",
		STATIC_JS: "STATIC_JS",
		STATIC_FLASH: "STATIC_FLASH",
		IFRAME: "IFRAME",
		HTML: "HTML"
	};
	Obj.PriorityMap = {
		STATIC_IMAGE: 1,
		HTML: 2,
		IFRAME: 3,
		STATIC_JS: 4,
		STATIC_FLASH: 5
	};
	Obj.Sort = function(a,b) {
		var ap = Obj.PriorityMap[a.type];
		var bp = Obj.PriorityMap[b.type];
		if(!bp) { return 1; }
		if(!ap) { return -1; }
		return ap - bp;
	};
	
	Obj.prototype.getType = function() { return this.type; };
	Obj.prototype.getResource = function() {
		return this.resource;
	};
	
	Obj.prototype.toString = function() {
		var str = "NonLinearResource";
		str += "\n\t type=" + this.getType();
		str += "\n\t resource=" + this.getResource();
		return str;
	};
	
	return Obj;
})();

if(typeof Object.freeze === "function") { Object.freeze(webapis.adframework.NonLinearVariation);}
if(typeof Object.freeze === "function") { Object.freeze(webapis.adframework.NonLinearResource);}

/**
Creatives
	Creative
		Linear
			Icons
				Icon program="foo" width="300" height="250" xPosition="left" yPosition="top" duration="00:00:00" offset="00:00:00" apiFramework=""
					StaticResource || HTMLResource || IFrameResource
					IconClicks
						IconClickThrough
						IconClickTracking
					IconViewTracking
*/

if (typeof window.webapis.adframework !== "object") {
	window.webapis.adframework = {};
}
/**
 * @brief Icon Model.
 * @details A BluePrint of Icon Model
 * @return Null
 */
webapis.adframework.Icon = (function() {
	"use strict";
	var Obj = function(options) {
		if (!options.program) {
			throw "Industry Icon MUST specify program attribute!";
		}
		if (!options.width || !options.height) {
			throw "Industry Icon MUST specify width/height!";
		}
		if (!options.xPosition || !options.yPosition) {
			throw "Industry Icon MUST specify xPosition/yPosition!";
		}
		if (!options.resources) {
			throw "Industry Icon MUST specify Resources Object!";
		}

		this.program = options.program; //(required) Identifies the industry initiative that the icon supports
		this.width = parseInt(options.width, 10); //(required) The width (in pixels) of the icon to be overlaid on the Ad
		this.height = parseInt(options.height, 10);
		this.xPosition = options.xPosition; //(required) "left", "right" or a numeric value (in pixels)
		this.yPosition = options.yPosition; //(required) "top", "bottom" or a numeric value (in pixels)
		this.resources = options.resources || [];

		//<--Optional Attribute
		this.offset = (typeof options.offset === "string") ? new webapis.adframework.Offset(options.offset) : options.offset; //Start time (in HH:MM:SS or HH:MM:SS.mmm format)
		this.duration = (typeof options.duration === "string") ? new webapis.adframework.Offset(options.duration) : options.duration; // The amount of time (in HH:MM:SS or HH:MM:SS.mmm format)

		//Optional Attribute-->

		//Ad Parameters for VPAID
		this.apiFramework = options.apiFramework;

		this.Rejected = false;
		this.Showed = false;
		this.eventTrackers = options.eventTrackers || [];
	};

	/**
	 * @brief getProgram
	 * @details Getter for this.program
	 * @return program in STRING
	 */
	Obj.prototype.getProgram = function() {
		return this.program;
	};

	/**
	 * @brief getWidth
	 * @details Getter for this.width
	 * @return width in INTEGER
	 */
	Obj.prototype.getWidth = function() {
		return this.width;
	};

	/**
	 * @brief getHeight
	 * @details Getter for this.height
	 * @return height in INTEGER
	 */
	Obj.prototype.getHeight = function() {
		return this.height;
	};

	/**
	 * @brief getX
	 * @details Getter for this.xPosition - "left", "right" or a numeric value (in pixels)
	 * @return xPosition in STRING
	 */
	Obj.prototype.getX = function() {
		return this.xPosition;
	};

	/**
	 * @brief getY
	 * @details Getter for this.xPosition - "top", "bottom" or a numeric value (in pixels)
	 * @return yPosition in STRING
	 */
	Obj.prototype.getY = function() {
		return this.yPosition;
	};

	/**
	 * @brief getOffset
	 * @details Getter for this.offset
	 * @return offset in STRING
	 */
	Obj.prototype.getOffset = function() {
		return this.offset;
	};

	/**
	 * @brief getDuration
	 * @details Getter for this.duration
	 * @return duration in STRING
	 */
	Obj.prototype.getDuration = function() {
		return this.duration;
	};

	/**
	 * @brief getDuration
	 * @details Getter for this.duration
	 * @return duration in STRING
	 */
	Obj.prototype.getResources = function() {
		return this.resources || [];
	};

	var PriorityMap = {
		STATIC_IMAGE: 1,
		HTML: 2,
		IFRAME: 3,
		STATIC_JS: 4,
		STATIC_FLASH: 5
	};

	/**
	* @fn		resourceComparer
	* @brief	
	*
	* @param[in]/[out]	: a
	*					: b
	* @return			: var resourceComparer =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var resourceComparer = function(a, b) {
		var ap = PriorityMap[a.type];
		var bp = PriorityMap[b.type];
		if (!bp) {
			return 1;
		}
		if (!ap) {
			return -1;
		}
		return ap - bp;
	};

	/**
	* @fn		getPriorityIconResource
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getPriorityIconResource =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getPriorityIconResource = function() {
		if (!this.resources) {
			return null;
		}
		if (!this._priorityResource) {
			this._priorityResource = function() {
				//Sort the Object with priority map
				this.resources.sort(resourceComparer);
				this.resources[0].getCompiledHtmlElement(this);

				return this.resources[0];
			}.call(this);
		}
		return this._priorityResource;
	};


	/**
	* @fn		handleEvent
	* @brief	
	*
	* @param[in]/[out]	: id
	*					: adPlayhead
	*					: adDuration
	*					: contentPlayhead
	*					: adAssetURI
	* @return			: Obj.prototype.handleEvent =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleEvent = function(id, adPlayhead, adDuration, contentPlayhead, adAssetURI) {
		this.eventTrackers.forEach(function(tracker) {
			if (tracker.shouldFire(id, adPlayhead, adDuration)) {
				tracker.fireTracker(contentPlayhead, adAssetURI);
			}
		});
	};

	return Obj;
})();
if (typeof Object.freeze === "function") {
	Object.freeze(webapis.adframework.Icon);
}

/**
Creatives
	Creative
		Linear
			Icons
				Icon program="foo" width="300" height="250" xPosition="left" yPosition="top" duration="00:00:00" offset="00:00:00" apiFramework=""
					StaticResource || HTMLResource || IFrameResource
					IconClicks
						IconClickThrough
						IconClickTracking
					IconViewTracking
*/

if (typeof window.webapis.adframework !== "object") {
	window.webapis.adframework = {};
}
/**
 * @brief IconResource Model.
 * @details A BluePrint of IconResource Model
 * @return Null
 */
webapis.adframework.IconResource = (function() {
	"use strict";
	var Obj = function(options) {
		if (!options.content) {
			throw "Icon MUST specify content";
		} else if (!options.resourceCategory) {
			throw "Icon Static Resource MUST specify TYPE";
		} else if ("STATIC" === options.resourceCategory && !options.creativeType) {
			throw "Icon Static Resource MUST specify creativeType";
		} else if ("STATIC" === options.resourceCategory && !options.clickThrough) {
			throw "Icon Static Resource MUST specify IconClickThrough";
		}
		else {
			;/*NULL*/
		}
		//(required)
		this.content = options.content;

		//(required) [STATIC,IFRAME,HTML]
		this.resourceCategory = options.resourceCategory;

		//(required only if StaticResource [IMAGE,JS,FLASH]
		/**
		* @fn		creativeType
		* @brief	
		*
		* @param[in]/[out]	: creativeType
		* @return			: this.creativeType =
		* @warning			: None
		* @exception		: None
		* @see
		*/
		this.creativeType = function(creativeType) {
			if (!creativeType) {
				return null;
			}
			if ((/javascript/gi).test(creativeType)) {
				return "JS";
			} else if ((/flash/gi).test(creativeType)) {
				return "FLASH";
			} else {
				return "IMAGE";
			}
		}(options.creativeType);

		/** Clickthrough and clicktracking information */
		/** (required only if StaticResource  */
		this.clickThrough = options.clickThrough;
		this.clickTrackers = options.clickTrackers;
		this.viewTrackers = options.viewTrackers;

		this.asset_url = ""; //For Tracking use
		/**
		* @fn		type
		* @brief	
		*
		* @param[in]/[out]	: _this
		* @return			: this.type =
		* @warning			: None
		* @exception		: None
		* @see
		*/
		this.type = function(_this) {
			if (!_this.creativeType) {
				return _this.resourceCategory;
			} else {
				return _this.resourceCategory + "_" + _this.creativeType;
			}
		}(this);
	};

	/**
	* @fn		getContent
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getContent =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getContent = function() {
		return this.content;
	};

	/**
	* @fn		getCompiledHtmlElement
	* @brief	
	*
	* @param[in]/[out]	: icon
	* @return			: Obj.prototype.getCompiledHtmlElement =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getCompiledHtmlElement = function(icon) {


		if (!this.content) {
			return null;
		}
		if (!this.compiledElement) {
			this.compiledElement = function() {

				if (this.type === "HTML") {
					return this.content;
				} else if (this.type === "STATIC_IMAGE") {
					this.asset_url = this.content;
					return function() {
						return "<a href='#' class='companionAdStaticResource' data-clickThrough='" + this.clickThrough + "'>" + "<img src='" + this.content + "' width='" + icon.getWidth() + "' height='" + icon.getHeight() + "' />" + "</a>";
					}.call(this);

				} else if (this.type === "IFRAME") {
					this.asset_url = this.content;
					return function() {
						return "<iframe src='" + this.content + "' width='" + icon.getWidth() + "' height='" + icon.getHeight() + "'></iframe>";
					}.call(this);
				} else if (this.type === "STATIC_JS") {
					this.asset_url = this.content;
					return function() {
						return "<script src='" + this.content + "'><script>";
					}.call(this);
				} else if (this.type === "STATIC_FLASH") {
					this.asset_url = this.content;
					return this.content;
				}
				else {
					;/*NULL*/
				}

				return this.content;

			}.call(this);
		}
		return this.compiledElement;
	};
	/**
	* @fn		getResourceCategory
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getResourceCategory =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getResourceCategory = function() {
		return this.resourceCategory;
	};
	/**
	* @fn		getCreativeType
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getCreativeType =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getCreativeType = function() {
		return this.creativeType;
	};
	/**
	* @fn		getClickThrough
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getClickThrough =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getClickThrough = function() {
		return this.clickThrough;
	};
	/**
	* @fn		getClickTrackers
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getClickTrackers =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getClickTrackers = function() {
		return this.clickTrackers;
	};
	/**
	* @fn		getType
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getType =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getType = function() {
		return this.type;
	};

	//On click, fire all click trackers
	/**
	* @fn		handleClick
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.handleClick =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleClick = function() {
		if (!this.clickTrackers) {
			return;
		}
		for (var i = 0; i < this.clickTrackers.length; i++) {
			this.clickTrackers[i].fireTracker(webapis.adframework.ContentManager.getState().currentContentPlayhead(), this.content);
		}
	};
	//On Show, fire all View trackers
	/**
	* @fn		handleDisplay
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.handleDisplay =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleDisplay = function() {
		if (!this.viewTrackers) {
			return;
		}
		for (var i = 0; i < this.viewTrackers.length; i++) {
			this.viewTrackers[i].fireTracker(webapis.adframework.ContentManager.getState().currentContentPlayhead(), this.content);
		}
	};
	return Obj;
})();
if (typeof Object.freeze === "function") {
	Object.freeze(webapis.adframework.IconResource);
}


if (typeof window.webapis.adframework !== "object") {
    window.webapis.adframework = {};
}
/**
 * @brief Companion Model.
 * @details A BluePrint of Companion Model
 * @return Null
 */

webapis.adframework.Companion = (function() {
    "use strict";
    var Obj = function(options) {
        if (!options.width || !options.height) {
            throw "Companion Ad MUST specify width/height!";
        }
		if (!options.resources) {
			throw "Companion Ad MUST specify Resources Object!";
		}
		
		//added by amit 
		this.uid = (function() {
			function s4() {
				return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
			}
			return "companion_" + s4() + s4();
		})();
		// end
		
        this.width = parseInt(options.width, 10); //(required) the pixel width of the placement slot for which the creative is intended
        this.height = parseInt(options.height, 10);
		this.resources = options.resources || [];

        //<--Optional Attribute
        this.id = options.id;
        this.assetWidth = options.assetWidth ? parseInt(options.assetWidth, 10) : 0; //the pixel width of the creative
        this.assetHeight = options.assetHeight ? parseInt(options.assetHeight, 10) : 0;
        this.expandedWidth = options.expandedWidth ? parseInt(options.expandedWidth, 10) : 0; //Max allowable width
        this.expandedHeight = options.expandedHeight ? parseInt(options.expandedHeight, 10) : 0; //Max allowable height
        this.adSlotID = options.adSlotID; //used to identify desired placement on a publisher's page
        //Optional Attribute-->

        this.altText = options.altText;

        //Ad Parameters for VPAID
        this.apiFramework = options.apiFramework;
        this.adParameters = options.adParameters;
      	this.Rejected = false;
      	this.Showed = false;
	this.eventTrackers = options.eventTrackers || [];
        this.removeCompanionErrorStaticImageResource();
	};
	
	/**
	* @fn		handleEvent
	* @brief	
	*
	* @param[in]/[out]	: id
	*					: adPlayhead
	*					: adDuration
	*					: contentPlayhead
	*					: adAssetURI
	* @return			: Obj.prototype.handleEvent 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleEvent = function(id, adPlayhead, adDuration, contentPlayhead, adAssetURI) {
		this.eventTrackers.forEach(function(tracker) {
			if (tracker.shouldFire(id, adPlayhead, adDuration)) {
				tracker.fireTracker(contentPlayhead, adAssetURI);
			}
		});
    };

	/**
	 * @brief getWidth
	 * @details Getter for this.width
	 * @return {[INTEGER]} [width]
	 */
    Obj.prototype.getWidth = function() {
        return this.width;
    };

	/**
	 * [getHeight]
	 * @return {[INTEGER]} [height]
	 */
    Obj.prototype.getHeight = function() {
        return this.height;
    };

	/**
	 * [getID]
	 * @return {[STRING]} [id]
	 */
    Obj.prototype.getID = function() {
        return this.id;
    };

	/**
	 * [getAdSlotID]
	 * @return {[STRING]} [adSlotID]
	 */
    Obj.prototype.getAdSlotID = function() {
        return this.adSlotID;
    };

	/**
	 * [getResources]
	 * @return {[CompanionResource Array]} [resources]
	 */
    Obj.prototype.getResources = function() {
        return this.resources || [];
    };

	/**
	 * [getAltText]
	 * @return {[STRING]} [altText]
	 */
    Obj.prototype.getAltText = function() {
        return this.altText;
    };

	/**
	 * [resourceComparer comparer function]
	 * @param  {[CompanionResource]} a [CompanionResource]
	 * @param  {[CompanionResource]} b [CompanionResource]
	 * @return {[INTEGER]}
	 */
    var resourceComparer = function(a, b) {
        var ap = webapis.adframework.CompanionResource.PriorityMap[a.type];
        var bp = webapis.adframework.CompanionResource.PriorityMap[b.type];
        if (!bp) {
            return 1;
        }
        if (!ap) {
            return -1;
        }
        return ap -bp;
    };


    Obj.prototype.removeCompanionErrorStaticImageResource = function() {
        for (var i = 0; i < this.resources.length; i++) {
            var resource = this.resources[i];
            if (resource.getType() === "STATIC_IMAGE") {
                var tempImg = document.createElement("img");
				this.errorStaticImg(tempImg, resource);
                tempImg.src = resource.getContent();
            }
        }
    };

	
	Obj.prototype.errorStaticImg = function(img, resource) {
		var tempImg = img;
		tempImg.onerror = function(resources, resource) {
            return function() {
				resources.splice(resources.indexOf(resource), 1);
			};
        }(this.resources, resource);
    };

	/**
	* @fn		getPriorityCompanionResource
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: _priorityResource
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getPriorityCompanionResource = function() {
        if (!this.resources || typeof this.resources === "undefined") {
            return null;
        }
        if (!this._priorityResource || typeof this._priorityResource === "undefined") {
            this._priorityResource = function() {
                if (!this.resources.length){
					return null;
				}
            	//Sort the Object with priority map
                this.resources.sort(resourceComparer);
				return this.resources[0];
            }.call(this);
        }
        return this._priorityResource;
    };

	/**
	* @fn		getAssetURI
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: asset_url
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getAssetURI = function() {
        return this.getPriorityCompanionResource() ? this.getPriorityCompanionResource().asset_url : null;
    };

	/**
	* @fn		setRejected
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: void
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setRejected = function() {
        this.Rejected = true;
    };
	/**
	* @fn		isRejected
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: void
	* @warning			: None
	* @exception		: None
	* @see
	*/
    Obj.prototype.isRejected = function() {
        return this.Rejected;
    };
	/**
	* @fn		setCreatedView
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: void
	* @warning			: None
	* @exception		: None
	* @see
	*/
    Obj.prototype.setCreatedView = function() {

    	if (this.Rejected){
    		this.Showed = false;
    		return;
    	}
        this.Showed = true;
    };
    /**
	* @fn		isShowed
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: boolean true or false
	* @warning			: None
	* @exception		: None
	* @see
	*/
    Obj.prototype.isShowed = function() {
        return (this.Rejected)? false : this.Showed;
    };


    return Obj;
})();
if (typeof Object.freeze === "function") {
    Object.freeze(webapis.adframework.Companion);
}

if (typeof window.webapis.adframework !== "object") {
    window.webapis.adframework = {};
}
/**
 * @brief CompanionResource Model.
 * @details A BluePrint of CompanionResource Model
 * @return Null
 */
webapis.adframework.CompanionResource = (function() {
    "use strict";
    var Obj = function(options) {
        if (!options.content) {
            throw "Companion Ad MUST specify content";
        } else if (!options.resourceCategory) {
            throw "Companion Ad Static Resource MUST specify TYPE";
        } else if ("STATIC" === options.resourceCategory && !options.creativeType) {
            throw "Companion Ad Static Resource MUST specify creativeType";
		} else if ("STATIC" === options.resourceCategory && !options.clickThrough) {
            throw "Companion Ad Static Resource MUST specify clickThroughURL";
        }
		else{
			;/*NULL*/
		}
        //(required)
        this.content = options.content;

        //(required) [STATIC,IFRAME,HTML]
        this.resourceCategory = options.resourceCategory;

        //(required only if StaticResource [IMAGE,JS,FLASH]
        this.creativeType = function(creativeType) {
            if (!creativeType) {
				return null;
			}
            if ((/javascript/gi).test(creativeType)) {
                return "JS";
            } else if ((/flash/gi).test(creativeType)) {
                return "FLASH";
            } else {
                return "IMAGE";
            }
        }(options.creativeType);

        //Clickthrough and clicktracking information
        //(required only if StaticResource
		this.clickThrough = options.clickThrough;
		this.clickTrackers = options.clickTrackers;

        this.asset_url = "";
        this.type = function(_this) {
            if (!_this.creativeType) {
                return _this.resourceCategory;
            } else {
                return _this.resourceCategory + "_" + _this.creativeType;
            }
        }(this);
    };

    Obj.PriorityMap = {
        STATIC_IMAGE: 1,
        HTML: 2,
        IFRAME: 3,
        STATIC_JS: 4,
        STATIC_FLASH: 5
    };
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj.PriorityMap);
	}

	/**
	* @fn		getContent
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Content 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getContent = function() {
        return this.content;
    };

	/**
	* @fn		getCompiledHtmlElement
	* @brief	
	*
	* @param[in]/[out]	: companion
	* @return			: content
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getCompiledHtmlElement = function(companion) {
        if (!this.content) {
            return null;
        }

        if (!this.compiledElement) {

            this.compiledElement = function() {

                if (this.type === "HTML") {
                    return this.content;
                } else if (this.type === "STATIC_IMAGE") {
                    this.asset_url = this.content;
					return function(){
						return "<a href='#' class='companionAdStaticResource'>"+
									"<img src='" + this.content + "' width='" + companion.getWidth() + "' height='" + companion.getHeight() + "' alt='" + companion.getAltText() + "' />"+
								"</a>";
					}.call(this);
                } else if (this.type === "IFRAME") {
                    this.asset_url = this.content;
                    return function() {
						return "<iframe src='" + this.content + "' width='" + companion.getWidth() + "' height='" + companion.getHeight() + "'></iframe>";
					}.call(this);
                } else if (this.type === "STATIC_JS") {
                    this.asset_url = this.content;
                    return function() {
						return "<script src='" + this.content + "'><script>";
					}.call(this);
                } else if (this.type === "STATIC_FLASH") {
                    this.asset_url = this.content;
					return function() {
						return "<EMBED src='"+this.asset_url+"' quality=high bgcolor=#000000  WIDTH='" + companion.getWidth() +"' HEIGHT='" + companion.getHeight() +"'></EMBED>";
					}.call(this);
                }
				else{
					;/*NULL*/
				}
                return this.content;

			}.call(this);
        }
        return this.compiledElement;
    };
	/**
	* @fn		getResourceCategory
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: ResourceCategory 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getResourceCategory = function() {
        return this.resourceCategory;
    };
	/**
	* @fn		getCreativeType
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: creativeType 
	* @warning			: None
	* @exception		: None
	* @see
	*/
    Obj.prototype.getCreativeType = function() {
        return this.creativeType;
    };
	/**
	* @fn		getClickThrough
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: ClickThrough 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getClickThrough = function() {
		return this.clickThrough;
    };
	/**
	* @fn		getClickTrackers
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: clickTrackers
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getClickTrackers = function() {
		return this.clickTrackers;
    };
	/**
	* @fn		getType
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Type 
	* @warning			: None
	* @exception		: None
	* @see
	*/
    Obj.prototype.getType = function() {
        return this.type;
    };
	/**
	* @fn		handleClick
	* @brief	On click, fire all click trackers
	*
	* @param[in]/[out]	: void
	* @return			: Obj
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleClick = function() {
		if (!this.clickTrackers) {
			return;
		}
		for (var i = 0; i < this.clickTrackers.length; i++) {
			if(webapis.adframework.core.getContentManager()) {
				this.clickTrackers[i].fireTracker(webapis.adframework.core.getContentManager().getState().currentContentPlayhead(), this.content);
			}
		}
	};
    return Obj;
})();
if (typeof Object.freeze === "function") {
    Object.freeze(webapis.adframework.Companion);
}

// This class is meant to be part of the video player that interacts with the Ad.
// It takes the VPAID creative as a parameter in its contructor.
if (typeof window.webapis.adframework !== "object") {
	window.webapis.adframework = {};
}
webapis.adframework.VPAIDWrapper = (function() {
	"use strict";
	/**
	 * @class VPAIDWrapper
	 * @description VPAIDWrapper An Interface Class between the Video Player and the VPaid Ad Unit
	 * @param {Object} VPAIDCreative retrieved from invoking Ad Unit's getVPAIDAd()
	 */
	var VPAIDWrapper = function(ad, adType, adProgram) {
		var creative;
		if(ad && adType === 'linear'){
			creative = ad.getLinearCreative();
		}
		else if(ad && adType === 'nonlinear') {
			creative = ad.getNonLinearCreative();
		}
		else{
			return; //TO DO Error Handling
		}
		
		this.DISABLE_VPAID_LOG = true;

		this._ad = ad;

		this._creative = creative;
		this._vpaidProgram = adProgram;
		this.mute = false;
		this.fireMuteEvent = false;

		if (this._creative instanceof webapis.adframework.LinearCreative) {
			this._type = "linear";
		} else if (this._creative instanceof webapis.adframework.NonLinearCreative) {
			this._type = "nonlinear";
		} else if (this._creative instanceof webapis.adframework.CompanionCreative) {
			this._type = "companion";
		} else {
			this._type = "unknown";
			throw ("Unknown VPAID creative type");
		}

		this._hasHaltedForClickToLinear = false;
		this.initTimeout();
		if (!this.checkVPAIDInterface(this._vpaidProgram)) {
			//The VPAIDCreative doesn't conform to the VPAID spec
			return;
		}
		this.setCallbacksForCreative();
	};
	
	VPAIDWrapper.prototype.initTimeout = function() {
		/** Minimum DisplayTime for nonlinear vpaid ad only*/
		this._displayMS = null;
		/** Store DisplayTimeOut for nonlinear vpaid ad only*/
		this._displayTimeOut = null;

		/** Store LoadingTimeOut for vpaid ad */
		/** Calling initAd() and not receiving AdLoaded event */
		this._vpaidLoadingTimeOut = null;

		/** Store StartTimeOut for vpaid ad */
		/** Calling startAd() and not receiving AdStarted event */
		this._vpaidStartTimeOut = null;

		/** Store AdLinearAdTimeOut for vpaid ad */
		this._vpaidAdLinearTimeOut = null;

		/** Store StopTimeOut for vpaid ad */
		/** Calling stopAd() and not receiving AdStopped event */
		this._vpaidStopTimeOut = null;
		
		/** Store SkipTimeOut for vpaid ad */
		/** Calling skipAd() and not receiving AdSkipped event */
		this._vpaidSkipTimeOut = null;
		
	};

	/**
	 * @function VPAIDWrapper.log
	 * @description custom log function
	 * @param  {string} log log
	 */
	VPAIDWrapper.prototype.log = function(log) {
		if (this.DISABLE_VPAID_LOG) {
			return;
		}
		var msg = "[VPAIDWrapper] " + log;
		webapis.adframework.events.dispatch("DEBUG_MESSAGE", {
			message: msg
		});
	};

	VPAIDWrapper.prototype.getInternalAd = function() {
		return this._ad;
	};

	VPAIDWrapper.prototype.getInternalCreative = function() {
		return this._creative;
	};

	/**
	 * @function VPAIDWrapper.setCallbacksForCreative
	 * @description This function registers the callbacks of each of the VPAIDevents
	 */
	VPAIDWrapper.prototype.setCallbacksForCreative = function() {
		//The key of the object is the event name and the value is a reference to the callback function that is registered with the creative
		var callbacks = {
			AdStarted: this.onStartAd,
			AdStopped: this.onStopAd,
			AdSkipped: this.onSkipAd,
			AdLoaded: this.onAdLoaded,
			AdLinearChange: this.onAdLinearChange,
			AdSizeChange: this.onAdSizeChange,
			AdExpandedChange: this.onAdExpandedChange,
			AdSkippableStateChange: this.onAdSkippableStateChange,
			AdDurationChange: this.onAdDurationChange,
			AdRemainingTimeChange: this.onAdRemainingTimeChange,
			AdVolumeChange: this.onAdVolumeChange,
			AdImpression: this.onAdImpression,
			AdClickThru: this.onAdClickThru,
			AdInteraction: this.onAdInteraction,
			AdVideoStart: this.onAdVideoStart,
			AdVideoFirstQuartile: this.onAdVideoFirstQuartile,
			AdVideoMidpoint: this.onAdVideoMidpoint,
			AdVideoThirdQuartile: this.onAdVideoThirdQuartile,
			AdVideoComplete: this.onAdVideoComplete,
			AdUserAcceptInvitation: this.onAdUserAcceptInvitation,
			AdUserMinimize: this.onAdUserMinimize,
			AdUserClose: this.onAdUserClose,
			AdPaused: this.onAdPaused,
			AdPlaying: this.onAdPlaying,
			AdError: this.onAdError,
			AdLog: this.onAdLog
		};
		// Looping through the object and registering each of the callbacks with the creative
		for (var eventName in callbacks) {
			if(callbacks[eventName]) {
				this._vpaidProgram.subscribe(callbacks[eventName].bind(this),
					eventName, this);
			}
			else{
			;/*NULL*/
			}
		}
		
	};

	/**
	 * @function VPAIDWrapper.handshakeVersion @description HandshakeVersion
	 */
	VPAIDWrapper.prototype.handshakeVersion = function() {
		this._vpaidVersion = this._vpaidProgram.handshakeVersion("2.0");
	};

	/**
	 * @function VPAIDWrapper.initAd
	 * @description Pass through for initAd - when the video player wants to call the ad
	 * @param  {integer} width
	 * @param  {integer} height
	 * @param  {string} viewMode        ['thumbnail','normal','fullscreen']
	 * @param  {integer} desiredBitrate
	 * @param  {object} creativeData    [from adParameter from the VPAID XML]
	 * @param  {object} environmentVars [meta data]
	 */
	VPAIDWrapper.prototype.initAd = function(width, height, viewMode, desiredBitrate, creativeData, environmentVars, displayMS) {
		var self = this;
		this._displayMS = displayMS;
		this.log("Initialized: " + this._ad.uid);
		//Setting VPAID load time out from config
		webapis.adframework.VisualOverlay.bufferingVPAIDObj.isPrebuffered = true;
		this._vpaidLoadingTimeOut = setTimeout(function() {
			self.triggerAdError("VPAID: Not receving AdLoaded event from Ad Unit after calling initAd()");
			self.stopAd();
		}, webapis.adframework.config.get("VPAID_DEFAULT_LOAD_TIMEOUT"));
		this._vpaidProgram.initAd(width, height, viewMode, desiredBitrate, creativeData, environmentVars);
	};

	/**
	 * @function VPAIDWrapper.onAdPaused
	 * @description Callback for AdPaused
	 */
	VPAIDWrapper.prototype.onAdPaused = function() {
		this.log("onAdPaused");
		
		var cManager = webapis.adframework.core.getContentManager();
		var adDuration = this.getAdDuration();
		var adPlayhead = adDuration - this.getAdRemainingTime();
		
		var param = {
			event: "pause",
			type: this._type,
			ad: this._ad,
			adDuration: adDuration,
			adPlayhead: adPlayhead
		};
		
		cManager.handleVPAIDEvent(param);		
	};

	/**
	 * @function VPAIDWrapper.onAdPlaying
	 * @description Callback for AdPlaying
	 */
	VPAIDWrapper.prototype.onAdPlaying = function() {
		this.log("onAdPlaying");
		
		var cManager = webapis.adframework.core.getContentManager();
		var adDuration = this.getAdDuration();
		var adPlayhead = adDuration - this.getAdRemainingTime();
		
		var param = {
			event: "resume",
			type: this._type,
			ad: this._ad,
			adDuration: adDuration,
			adPlayhead: adPlayhead
		};
		
		cManager.handleVPAIDEvent(param);
	};

	/**
	 * @function VPAIDWrapper.onAdError
	 * @description Callback for AdError<p><ul><li>Display "VPAID_ERROR" EVENT</li><li>Clean up Resource</li></ul></p>
	 */
	VPAIDWrapper.prototype.onAdError = function(message) {
		var self = this;
		this.log("onAdError: " + message);
		if(true === this.cleared) {
			return false;
		}
		if (this._stopPromise) {
			this._stopPromise.reportSuccess();
			this._stopPromise = null;
		}
	
		var clearPromise = new webapis.adframework.Promise();
		clearPromise.onSuccess(function() {
			self.clearResource();			
		});
		webapis.adframework.events.dispatch("VPAID_ERROR", {
			ad: this._ad,
			type: this._type,
			errorMessage: message,
			clearPromise: clearPromise
		});
	};

	/**
	 * @function VPAIDWrapper.triggerAdError
	 * @description trigger Ad Error
	 */
	VPAIDWrapper.prototype.triggerAdError = function(message) {
		this.log("VPAID triggerAdError: " + message);
		this.onAdError(message);
	};

	/**
	 * @function VPAIDWrapper.onAdLog
	 * @description Callback for AdLog
	 */
	VPAIDWrapper.prototype.onAdLog = function(message) {
		this.log("onAdLog: " + message);
	};

	/**
	 * @function VPAIDWrapper.onAdUserAcceptInvitation
	 * @description Callback for AdUserAcceptInvitation
	 */
	VPAIDWrapper.prototype.onAdUserAcceptInvitation = function() {
		this.log("onAdUserAcceptInvitation");
		
		var cManager = webapis.adframework.core.getContentManager();
		var adDuration = this.getAdDuration();
		var adPlayhead = adDuration - this.getAdRemainingTime();
		
		var param = {
			event: "acceptInvitation",
			type: this._type,
			ad: this._ad,
			adDuration: adDuration,
			adPlayhead: adPlayhead
		};
		
		cManager.handleVPAIDEvent(param);
	};

	/**
	 * @function VPAIDWrapper.onAdUserMinimize
	 * @description Callback for AdUserMinimize
	 */
	VPAIDWrapper.prototype.onAdUserMinimize = function() {
		this.log("onAdUserMinimize");
		
		var cManager = webapis.adframework.core.getContentManager();
		var adDuration = this.getAdDuration();
		var adPlayhead = adDuration - this.getAdRemainingTime();
		
		var param = {
			event: "collapse",
			type: this._type,
			ad: this._ad,
			adDuration: adDuration,
			adPlayhead: adPlayhead
		};
		
		cManager.handleVPAIDEvent(param);
	};

	/**
	 * @function VPAIDWrapper.onAdUserClose
	 * @description Callback for AdUserClose
	 */
	VPAIDWrapper.prototype.onAdUserClose = function() {
		this.log("onAdUserClose");
		var cManager = webapis.adframework.Core.getContentManager();
		var adDuration = this.getAdDuration();
		var adPlayhead = adDuration - this.getAdRemainingTime();
		
		var param = {
			event: "close",
			type: this._type,
			ad: this._ad,
			adDuration: adDuration,
			adPlayhead: adPlayhead,
			linear: this._vpaidProgram.getAdLinear()
		};
		
		cManager.handleVPAIDEvent(param);
	};

	/**
	 * @function VPAIDWrapper.onAdSkippableStateChange
	 * @description Callback for AdSkippableStateChange
	 */
	VPAIDWrapper.prototype.onAdSkippableStateChange = function() {
		this.log("Ad Skippable State Changed to: " + this._vpaidProgram.getAdSkippableState());
	};

	/**
	 * @function VPAIDWrapper.onAdExpandedChange
	 * @description Callback for AdExpandedChange
	 */
	VPAIDWrapper.prototype.onAdExpandedChange = function() {
		;/*NULL*/
	};

	/**
	 * @function VPAIDWrapper.getAdExpanded
	 * @description Pass through for getAdExpanded
	 * @return {Boolean} this._vpaidProgram.getAdExpanded();
	 */
	VPAIDWrapper.prototype.getAdExpanded = function() {
		this.log("getAdExpanded");
		return this._vpaidProgram.getAdExpanded();
	};

	/**
	 * @function VPAIDWrapper.getAdSkippableState
	 * @description Pass through for getAdSkippableState
	 * @return {Boolean} this._vpaidProgram.getAdSkippableState();
	 */
	VPAIDWrapper.prototype.getAdSkippableState = function() {
		this.log("getAdSkippableState");
		return this._vpaidProgram.getAdSkippableState();
	};

	/**
	 * @function VPAIDWrapper.onAdSizeChange
	 * @description Callback for AdSizeChange
	 */
	VPAIDWrapper.prototype.onAdSizeChange = function() {
		this.log("Ad size changed to: w=" + this._vpaidProgram.getAdWidth() + "h = " + this._vpaidProgram.getAdHeight());
	};

	/**
	 * @function VPAIDWrapper.onAdDurationChange
	 * @description Callback for AdDurationChange
	 */
	VPAIDWrapper.prototype.onAdDurationChange = function() {
		if (this.getAdDuration()>0){
			this.VPAIDDuration = this.getAdDuration() * 1000;
		}

		this.setupLinearTimeout();
		this.setupLinearTimeCheck();
	};

	/**
	 * @function VPAIDWrapper.onAdRemainingTimeChange
	 * @description Callback for AdRemainingTimeChange
	 */
	VPAIDWrapper.prototype.onAdRemainingTimeChange = function() {
		this.log("Ad Remaining Time Changed to: " + this._vpaidProgram.getAdRemainingTime());
		// TODO: Update controller with info and dispatch events
	};

	/**
	 * @function VPAIDWrapper.getAdRemainingTime
	 * @description Pass through for getAdRemainingTime
	 * @return {string} this._vpaidProgram.getAdRemainingTime();
	 */
	VPAIDWrapper.prototype.getAdRemainingTime = function() {
		var remaining = this._vpaidProgram.getAdRemainingTime();
		return remaining;
	};

	/**
	 * @function VPAIDWrapper.getAdDuration
	 * @description Pass through for getAdDuration
	 * @return {string} this._vpaidProgram.getAdDuration();
	 */
	VPAIDWrapper.prototype.getAdDuration = function() {
		var duration = this._vpaidProgram.getAdDuration();
		return duration;
	};

	/**
	 * @function VPAIDWrapper.onAdImpression
	 * @description Callback for AdImpression
	 */
	VPAIDWrapper.prototype.onAdImpression = function() {
		var cManager = webapis.adframework.core.getContentManager();
		
		var param = {
			event: "impression",
			type: this._type,
			ad: this._ad
		};
		
		cManager.handleVPAIDEvent(param);	
	};

	/**
	 * @function VPAIDWrapper.onAdClickThru
	 * @description Callback for AdClickThru
	 */
	VPAIDWrapper.prototype.onAdClickThru = function(url, id, playerHandles) {
		this.log("Clickthrough portion of the ad was clicked");
		this.log(url + " " + id + " " + playerHandles);

		var cManager = webapis.adframework.core.getContentManager();
		
		var param = {
			event: "ClickTracking",
			type: this._type,
			ad: this._ad
		};
		
		cManager.handleVPAIDEvent(param);
		if (!playerHandles) {
			this.log("NO AdClickThru");
			return;
		}
		webapis.adframework.VisualOverlay.setIFrameFromVPAID();
		webapis.adframework.VisualOverlay.openIFrame(url);
	};

	/**
	 * @function VPAIDWrapper.onAdInteraction
	 * @description Callback for AdInteraction
	 */
	VPAIDWrapper.prototype.onAdInteraction = function() {
		var self = this;
		if (this._displayTimeOut) {
			clearTimeout(this._displayTimeOut);
		}
		if (!this._vpaidProgram.adLinear) {
			this._displayTimeOut = setTimeout(function() {
				self.stopAd();
			}, 60000);
		}
	};

	/**
	 * @function VPAIDWrapper.onAdVideoStart
	 * @description Callback for AdVideoStart
	 */
	VPAIDWrapper.prototype.onAdVideoStart = function() {
		this.log("VPAIDWrapper onAdVideoStart: " + this._ad.uid);
		var cManager = webapis.adframework.core.getContentManager();
		var adDuration = this.getAdDuration();
		var adPlayhead = adDuration - this.getAdRemainingTime();
		
		var param = {
			event: "start",
			type: this._type,
			ad: this._ad,
			adDuration: adDuration,
			adPlayhead: adPlayhead
		};
		
		cManager.handleVPAIDEvent(param);	
		this.setupLinearTimeout();
	};

	/**
	 * @function VPAIDWrapper.onAdVideoFirstQuartile
	 * @description Callback for AdVideoFirstQuartile
	 */
	VPAIDWrapper.prototype.onAdVideoFirstQuartile = function() {
		this.log("Video 25% completed");
		var cManager = webapis.adframework.core.getContentManager();
		var adDuration = this.getAdDuration();
		var adPlayhead = adDuration - this.getAdRemainingTime();
		
		var param = {
			event: "firstQuartile",
			type: this._type,
			ad: this._ad,
			adDuration: adDuration,
			adPlayhead: adPlayhead
		};
		
		cManager.handleVPAIDEvent(param);		

	};

	/**
	 * @function VPAIDWrapper.onAdVideoMidpoint
	 * @description Callback for AdVideoMidpoint
	 */
	VPAIDWrapper.prototype.onAdVideoMidpoint = function() {
		this.log("Video 50% completed");
		var cManager = webapis.adframework.core.getContentManager();
		var adDuration = this.getAdDuration();
		var adPlayhead = adDuration - this.getAdRemainingTime();
		
		var param = {
			event: "midpoint",
			type: this._type,
			ad: this._ad,
			adDuration: adDuration,
			adPlayhead: adPlayhead
		};
		
		cManager.handleVPAIDEvent(param);		
	};

	/**
	 * @function VPAIDWrapper.onAdVideoThirdQuartile
	 * @description Callback for AdVideoThirdQuartile
	 */
	VPAIDWrapper.prototype.onAdVideoThirdQuartile = function() {
		this.log("Video 75% completed");
		var cManager = webapis.adframework.core.getContentManager();
		var adDuration = this.getAdDuration();
		var adPlayhead = adDuration - this.getAdRemainingTime();
		
		var param = {
			event: "thirdQuartile",
			type: this._type,
			ad: this._ad,
			adDuration: adDuration,
			adPlayhead: adPlayhead
		};
		
		cManager.handleVPAIDEvent(param);		

		//cManager.prebufferingForVPAID();	//Not required here..Timing Event will handle automatically
	};

	/**
	 * @function VPAIDWrapper.onAdVideoComplete
	 * @description Callback for AdVideoComplete
	*/
	VPAIDWrapper.prototype.onAdVideoComplete = function() {
		var self = this;
		this.log("Video 100% completed");
		
		//To send the last timing event which is equivalent to duration
		if(this.getAdLinear() === true) {
			var duration = self.getAdDuration();
			if (!isNaN(duration) && duration !== self.VPAIDDuration && duration > 0) {
				self.VPAIDDuration = duration;
			}
			webapis.adframework.events.dispatch(webapis.adframework.events.VPAID_LINEAR_PLAYBACK_TIME, {
				ms: self.VPAIDDuration
			});
		}
		
		this.stopAd();
		var cManager = webapis.adframework.core.getContentManager();
		var adDuration = this.getAdDuration();
		var adPlayhead = adDuration - this.getAdRemainingTime();
		
		var param = {
			event: "complete",
			type: this._type,
			ad: this._ad,
			adDuration: adDuration,
			adPlayhead: adPlayhead
		};
		
		cManager.handleVPAIDEvent(param);		
	};

	/**
	 * @function VPAIDWrapper.onAdLinearChange
	 * @description Callback for AdLinearChange
	 */
	VPAIDWrapper.prototype.onAdLinearChange = function() {
		this.log("Ad linear has changed: " + this._vpaidProgram.getAdLinear());

		webapis.adframework.events.dispatch(webapis.adframework.events.VPAID_LINEARITY_CHANGE, {
			isLinear: this._vpaidProgram.getAdLinear(),
			wrapper: this
		});
		webapis.adframework.events.dispatch("DEBUG_MESSAGE", {
			message: "VPAID linearity change complete"
		});

		this.setupLinearTimeout();
		this.setupLinearTimeCheck();
	};

	VPAIDWrapper.prototype.setupLinearTimeCheck = function() {
		var self = this;

		if(this.getAdLinear() === true) {
			if(!this.linearTimeCheckInterval) {
				this.linearTimeCheckInterval = setInterval(function() {
					var duration = self.getAdDuration();
					if (!isNaN(duration) && duration !== self.VPAIDDuration) {
						self.VPAIDDuration = duration;
					}
					var remaining = self.getAdRemainingTime();
					if(!isNaN(remaining) && remaining >= 0 && duration > 0){
						var tempCurrentTime = parseInt((duration - remaining) * 1000, 10);
						//alert("tempCurrentTime: " + tempCurrentTime)
						if (!isNaN(tempCurrentTime) && tempCurrentTime !== self.currentAdLinearTime) {
							self.currentAdLinearTime = tempCurrentTime;
							webapis.adframework.events.dispatch(webapis.adframework.events.VPAID_LINEAR_PLAYBACK_TIME, {
								ms: tempCurrentTime
							});
						}
					}
				}, 500);
			}
		}
		else {
			this.stopLinearTimeCheck();
		}		
	};

	VPAIDWrapper.prototype.stopLinearTimeCheck = function() {
		if(this.linearTimeCheckInterval) {
			clearInterval(this.linearTimeCheckInterval);
			this.linearTimeCheckInterval = null;
		}
		
	};

	VPAIDWrapper.prototype.setupLinearTimeout = function() {
		var self = this;
		if (this.getAdLinear() === true && this.getAdRemainingTime() > 0) {
			var timeoutvalue = this.getAdRemainingTime() * 1000 + webapis.adframework.config.get("VPAID_DEFAULT_ADLINEAR_TIMEOUT");

			if (!this._vpaidAdLinearTimeOut) {
				this._vpaidAdLinearTimeOut = new webapis.adframework.utils.Timer(function() {
					self.log("linear ad timeout!!");
					self.stopAd();
				}, timeoutvalue);
			} else {
				this._vpaidAdLinearTimeOut.reset(timeoutvalue);
			}

		} else if (this.getAdLinear() === false) {
			if (this._vpaidAdLinearTimeOut) {
				this._vpaidAdLinearTimeOut.clear();
			}
		} else {
			this.log("setupLinearTimeout: fail because adLinear is " + this.getAdLinear() + " and remaining time = " + this.getAdRemainingTime());
			setTimeout(function() {
				self.setupLinearTimeout();
			}, 1000);
		}
	};

	/**
	 * @function VPAIDWrapper.getAdLinear
	 * @description Pass through for getAdLinear
	 * @return {Boolean} this._vpaidProgram.getAdLinear()
	 */
	VPAIDWrapper.prototype.getAdLinear = function() {
		return this._vpaidProgram.getAdLinear();
	};

	/**
	 * @function VPAIDWrapper.startAd
	 * @description Pass through for startAd()
	 */
	VPAIDWrapper.prototype.startAd = function() {
		var self = this;
		this.VPAIDDuration = 0;
		this.log("startAd");
		
		if (this._displayMS) {
			this._displayTimeOut = setTimeout(function() {
				self.stopAd();
			}, this._displayMS);
		}
		this._vpaidStartTimeOut = setTimeout(function() {
			self.triggerAdError("VPAID: Not receving AdStarted event from Ad Unit after calling startAd()");
			self.stopAd();
		}, webapis.adframework.config.get("VPAID_DEFAULT_START_TIMEOUT"));
		this._vpaidProgram.startAd();
		if (this._vpaidProgram.getAdLinear() && this.getAdRemainingTime()>0){
			;/*NULL*/
		}

	};

	/**
	 * @function VPAIDWrapper.onAdLoaded
	 * @description Callback for AdLoaded
	 */
	VPAIDWrapper.prototype.onAdLoaded = function() {
	
		this.log("VPAIDWrapper onAdLoaded: " + this._ad.uid);
		webapis.adframework.VisualOverlay.bufferingVPAIDObj.adload = true;
		
		if(webapis.adframework.VisualOverlay.bufferingVPAIDObj && webapis.adframework.VisualOverlay.bufferingVPAIDObj.initPromise) {
			webapis.adframework.VisualOverlay.bufferingVPAIDObj.initPromise.reportSuccess();
		}
		if (this._vpaidLoadingTimeOut) {
			clearTimeout(this._vpaidLoadingTimeOut);
		}
		this.log("ad has been loaded: " + this._ad.uid);
	};

	/**
	 * @function VPAIDWrapper.onStartAd
	 * @description Callback for StartAd
	 */
	VPAIDWrapper.prototype.onStartAd = function() {
		if (this._vpaidStartTimeOut) {
			clearTimeout(this._vpaidStartTimeOut);
		}
		
		this.log("Ad has started");
		var cManager = webapis.adframework.core.getContentManager();
		var adDuration = this.getAdDuration();
		var adPlayhead = adDuration - this.getAdRemainingTime();
		
		var param = {
			event: "creativeView",
			type: this._type,
			ad: this._ad,
			adDuration: adDuration,
			adPlayhead: adPlayhead
		};
		
		cManager.handleVPAIDEvent(param);		

		this.setupLinearTimeout();
		this.setupLinearTimeCheck();
	};

	/**
	 * @function VPAIDWrapper.stopAd
	 * @description Pass through for stopAd()
	 */
	VPAIDWrapper.prototype.stopAd = function(stopPromise, user) {
		var self = this;
		this.stopByUser = user;
		this._stopPromise = stopPromise;

		this._vpaidStopTimeOut = setTimeout(function() {
			self.triggerAdError("VPAID: Not receving AdStopped event from Ad Unit after calling stopAd()");
			self.onStopAd();	//Handle Stop if not recieved
		}, webapis.adframework.config.get("VPAID_DEFAULT_STOP_TIMEOUT"));
		this._vpaidProgram.stopAd();
		this.stopLinearTimeCheck();
	};

	/**
	 * @function VPAIDWrapper.onStopAd
	 * @description Callback for StopAd
	 */
	VPAIDWrapper.prototype.onStopAd = function() {
		var self = this;
		this.stopLinearTimeCheck();
		if(true === this.cleared) {
			return false;
		}
		if (this._vpaidStopTimeOut) {
			clearTimeout(this._vpaidStopTimeOut);
		}
		this.log("Ad has stopped");
		if (this._hasHaltedForClickToLinear === true) {
			webapis.adframework.core.getContentManager().resumeFromMidroll();
		}
		if (this._stopPromise) {
			this._stopPromise.reportSuccess();
			this._stopPromise = null;
		}
		var clearPromise = new webapis.adframework.Promise();
		clearPromise.onSuccess(function() {
			self.clearResource();			
		});
		webapis.adframework.events.dispatch("VPAID_COMPLETE", {
			ad: this._ad,
			type: this._type,
			clearPromise: clearPromise,
			noCallback: this.stopByUser
		});
		
		this.stopByUser = false;
		
	};

	/**
	 * @function VPAIDWrapper.onSkipAd
	 * @description Callback for SkipAd
	 */
	VPAIDWrapper.prototype.onSkipAd = function() {
		var self = this;
		if(true === this.cleared) {
			return false;
		}
		this.log("Ad was skipped: " + this._ad.uid);
		if (this._vpaidSkipTimeOut) {
			clearTimeout(this._vpaidSkipTimeOut);
		}		
		var cManager = webapis.adframework.core.getContentManager();
		var adDuration = this.getAdDuration();
		var adPlayhead = adDuration - this.getAdRemainingTime();
		
		var param = {
			event: "skip",
			type: this._type,
			ad: this._ad,
			adDuration: adDuration,
			adPlayhead: adPlayhead
		};
		
		cManager.handleVPAIDEvent(param);		
		if (this._hasHaltedForClickToLinear === true) {
			cManager.resumeFromMidroll();
		}
		
		var clearPromise = new webapis.adframework.Promise();
		clearPromise.onSuccess(function() {
			self.clearResource();			
		});
		webapis.adframework.events.dispatch("VPAID_COMPLETE", {
			ad: this._ad,
			type: this._type,
			clearPromise: clearPromise
		});
	
	};

	/**
	 * @function VPAIDWrapper.skipAd
	 * @description Pass through for skipAd
	 */
	VPAIDWrapper.prototype.skipAd = function() {
	//For version preceeding 2.0, we will not skip ad as we no information if ad can be skipped or not
		var self = this;
		if (typeof this._vpaidProgram.getAdSkippableState !== 'undefined' && typeof this._vpaidProgram.skipAd !== 'undefined') {
			if (this._vpaidProgram.getAdSkippableState() === true) {
			
				this._vpaidSkipTimeOut = setTimeout(function() {
					self.triggerAdError("VPAID: Not receving AdSkipped event from Ad Unit after calling skipAd()");
					self.stopAd();	//Handle Stop if not recieved
				}, webapis.adframework.config.get("VPAID_DEFAULT_STOP_TIMEOUT"));
				this._vpaidProgram.skipAd();
			} else {
				this.log("VPAID Ad cannot be skipped");
			}
		} else {
			this.log("VPAID Ad cannot be skipped");
		}
	};

	/**
	 * @function VPAIDWrapper.setAdVolume
	 * @description Pass through for setAdVolume()
	 */
	VPAIDWrapper.prototype.setAdVolume = function(val) {
		this.volume = val;
		this._vpaidProgram.setAdVolume(val/100);
	};

	/**
	 * @function VPAIDWrapper.getAdVolume
	 * @description Pass through for getAdVolume()
	 */
	VPAIDWrapper.prototype.getAdVolume = function() {
		return this._vpaidProgram.getAdVolume();
	};

	/**
	 * @function VPAIDWrapper.onAdVolumeChange
	 * @description Callback for AdVolumeChange
	 */
	VPAIDWrapper.prototype.onAdVolumeChange = function() {
		this.log("Ad Volume has changed to - " + this._vpaidProgram.getAdVolume());
		
		var cManager = webapis.adframework.core.getContentManager();
		var adDuration = this.getAdDuration();
		var adPlayhead = adDuration - this.getAdRemainingTime();
		var param;
		
		if(this.fireMuteEvent === true && this.mute === false) {
			this.mute = true;
			param = {
				event: "mute",
				type: this._type,
				ad: this._ad,
				adDuration: adDuration,
				adPlayhead: adPlayhead
			};
			cManager.handleVPAIDEvent(param);
		}
		else if (this.fireMuteEvent === true && this.mute === true){
			
			this.mute = false;		
			param = {
				event: "unmute",
				type: this._type,
				ad: this._ad,
				adDuration: adDuration,
				adPlayhead: adPlayhead
			};
			cManager.handleVPAIDEvent(param);
		}
		else {
			;/*NULL*/
		}
	};

	/**
	 * @function VPAIDWrapper.resizeAd
	 * @description Pass through for resizeAd()
	 */
	VPAIDWrapper.prototype.resizeAd = function(width, height, viewMode) {
		this._vpaidProgram.resizeAd(width, height, viewMode);
	};

	/**
	 * @function VPAIDWrapper.pauseAd
	 * @description Pass through for pauseAd()
	 */
	VPAIDWrapper.prototype.pauseAd = function() {
		this._vpaidProgram.pauseAd();
		if (this._vpaidAdLinearTimeOut) {
			this._vpaidAdLinearTimeOut.pause();
		}
	};

	/**
	 * @function VPAIDWrapper.resumeAd
	 * @description Pass through for resumeAd()
	 */
	VPAIDWrapper.prototype.resumeAd = function() {
		this._vpaidProgram.resumeAd();
		if (this._vpaidAdLinearTimeOut) {
			this._vpaidAdLinearTimeOut.resume();
		}
	};

	/**
	 * @function VPAIDWrapper.expandAd
	 * @description Pass through for expandAd()
	 */
	VPAIDWrapper.prototype.expandAd = function() {
		this._vpaidProgram.expandAd();
	};

	/**
	 * @function VPAIDWrapper.collapseAd
	 * @description Pass through for collapseAd()
	 */
	VPAIDWrapper.prototype.collapseAd = function() {
		this._vpaidProgram.collapseAd();
	};

	/**
	 * @function VPAIDWrapper.clearResource
	 * @description Calling @Class{VisualOverlay} to clean up resource
	 */
	VPAIDWrapper.prototype.clearResource = function() {
		this.cleared = true;
		this.log("clean resource: " + this._ad.uid);
		if (this._displayTimeOut) {
			clearTimeout(this._displayTimeOut);
		}
		if (this._vpaidLoadingTimeOut) {
			clearTimeout(this._vpaidLoadingTimeOut);
		}
		if (this._vpaidStartTimeOut) {
			clearTimeout(this._vpaidStartTimeOut);
		}
		if (this._vpaidStopTimeOut) {
			clearTimeout(this._vpaidStopTimeOut);
		}
		if (this._vpaidSkipTimeOut) {
			clearTimeout(this._vpaidSkipTimeOut);
		}
		if (this._vpaidAdLinearTimeOut) {
			this._vpaidAdLinearTimeOut.clear();
		}
		webapis.adframework.VisualOverlay.VPAIDClean();
	};
	/**
	 * @function VPAIDWrapper.checkVPAIDInterface
	 * @description Checking if input is a valid VPAIDCreative
	 * @param  {object} VPAIDCreative
	 * @return {boolean}
	 */
	VPAIDWrapper.prototype.checkVPAIDInterface = function(VPAIDCreative) {
		if (
			VPAIDCreative.handshakeVersion && typeof VPAIDCreative.handshakeVersion === "function" &&
			VPAIDCreative.initAd && typeof VPAIDCreative.initAd === "function" &&
			VPAIDCreative.startAd && typeof VPAIDCreative.startAd === "function" &&
			VPAIDCreative.stopAd && typeof VPAIDCreative.stopAd === "function" &&
			VPAIDCreative.skipAd && typeof VPAIDCreative.skipAd === "function" &&
			VPAIDCreative.resizeAd && typeof VPAIDCreative.resizeAd === "function" &&
			VPAIDCreative.pauseAd && typeof VPAIDCreative.pauseAd === "function" &&
			VPAIDCreative.resumeAd && typeof VPAIDCreative.resumeAd === "function" &&
			VPAIDCreative.expandAd && typeof VPAIDCreative.expandAd === "function" &&
			VPAIDCreative.collapseAd && typeof VPAIDCreative.collapseAd === "function" &&
			VPAIDCreative.subscribe && typeof VPAIDCreative.subscribe === "function" &&
			VPAIDCreative.unsubscribe && typeof VPAIDCreative.unsubscribe === "function") {
			return true;
		}
		return false;
	};
	return VPAIDWrapper;
})();

if (typeof Object.freeze === "function") {
	Object.freeze(webapis.adframework.VPAIDWrapper);
}

/**
* @file     : ContentManager.js
* @brief    : 
*           
* @author   : Jasmine
* @date     : 2014/8/5
*
* Copyright 2014 by Samsung Electronics Inc.
*
* This software is the confidential and proprietary information
* of Samsung Electronics Inc. (Confidential Information).  You
* shall not disclose such Confidential Information and shall use
* it only in accordance with the terms of the license agreement
* you entered into with Samsung.
*
*/

if(typeof window.webapis.adframework !== "object") {
	window.webapis.adframework = {}; 
}
/**
 * @brief ContentManager Model.
 * @details A BluePrint of ContentManager Model
 * @return Null
 */

webapis.adframework.ContentManager = (function() {
	
	"use strict";
	
	var Obj = function() {	
		this.audio = null; //Should be the SAMSUNG-INFOLINK-AUDIO, once initialized
		this.currentAdCallback = null;
		this.state = null; //Should be webapis.adframework.MediaState
		this.scheduler = null; //Should be webapis.adframework.Scheduler
		this.player = null;
		this.isEventTriggerPlay = false;
		this.adOnPause = false;
		this.companion_shown = false;		//To handle targets if only linear ads in the MAST
		this.isCompanionRendered = false;
		this.pauseOnClick = false;
		this.foundBreak = false;
		this.breakDur = 0;
	};
	
	var self = null;
	
	//Enums by amit tyagi
	Obj.MEvents = {
		OnPlay: 				"OnPlay",
		OnPause: 				"OnPause",
		OnStop: 				"OnStop",
		OnMute: 				"OnMute",
		OnSeek: 				"OnSeek",
		OnVolumeChange:			"OnVolumeChange",
		OnFullScreenChange:		"OnFullScreenChange",
		OnItemStart: 			"OnItemStart",
		OnItemEnd: 				"OnItemEnd",
		OnEnd: 					"OnEnd",
		OnPlayerSizeChanged:  	"OnPlayerSizeChanged",
		OnError : 				"OnError",
		OnMouseOver: 			"OnMouseOver",
		NONE: 					"NONE"
	};
	if(typeof Object.freeze === "function") {
		Object.freeze(Obj.MEvents);
	}
	
	//Backdoor into the state, returns PlaybackType
	/**
	* @fn		getCurrentPlaybackType
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getCurrentPlaybackType =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getCurrentPlaybackType = function() {
		return this.state.currentPlaybackType(); //returns one of the PlaybackType
	};
	
	//Resets the schedule and internal state of the Ad Framework.
	/**
	* @fn		resetState
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.resetState =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	
	Obj.prototype.resetState = function() {
		this.info(" Calling stop from resetState ");
		
		webapis.adframework.events.dispatch(webapis.adframework.events.CLOSE_NONLINEAR, "");	//close currently running non linear by calling hineNonLinearClose
		this.player.stop();
		this.player.cancelBufferedVideo();
		this.currentAdCallback = null;
		this.isEventTriggerPlay = false;
		this.adOnPause = false;
		this.companion_shown = false;
		this.isCompanionRendered = false;
		this.pauseOnClick = false;
		this.foundBreak = false;
		this.breakDur = 0;
		this.state.initializeState();
		this.scheduler.initializeState();
		this.resetVPAID();
	};
	
	//Constants
	var STREAM_AUDIO = 1; 
	var	STREAM_VIDEO = 3;	
	var	STREAM_INTERNAL_SUBTITLE = 4;

	/** reset VPAID */
	Obj.prototype.resetVPAID = function() {
		if (webapis.adframework.VisualOverlay.VPAIDWrapper) {
			webapis.adframework.VisualOverlay.VPAIDWrapper.stopAd();
		}
		webapis.adframework.VisualOverlay.VPAIDClean();
	};
	
	//*******************************************************************************************************
	//INITIALIZATION
	//*******************************************************************************************************
	
	//Give the player the ID of the SAMSUNG-INFOLINK-PLAYER and SAMSUNG-INFOLINK-AUDIO
	/**
	* @fn		initialize
	* @brief	
	*
	* @param[in]/[out]	: playerId1
	*					: playerId2
	*					: audioId
	* @return			: Obj.prototype.initialize =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initialize = function(playerId1, playerId2, audioId) {
		self = this; //To help scoping	
		
		this.state = new webapis.adframework.MediaState();
		this.scheduler = new webapis.adframework.Scheduler(this.state);
		if (!playerId1) {
            		playerId1 = webapis.adframework.PluginManager.generateUniqueID("playerAdapter_1_");
        	}
		else {
			; /*NULL*/
		}
        	
		if (!playerId2) {
           		 playerId2 = webapis.adframework.PluginManager.generateUniqueID("playerAdapter_2_");
        	}
		else {
			; /*NULL*/
		}
		
	    this.player = new webapis.adframework.TizenAdapter(playerId1, playerId2);
		this.player.stop();
		
		if(!audioId) { 
            this.audio = webapis.adframework.PluginManager.generateAudioPlugin();
        } else {
		this.audio = document.getElementById(audioId);
        }

		//Error handling
		this.player.addListener(webapis.adframework.PlayerAdapter.events.RENDER_ERROR, this.internalOnActivePlayerProblem);
		this.player.addListener(webapis.adframework.PlayerAdapter.events.PREBUFFERING_RENDER_ERROR, this.internalOnDormantPlayerProblem);

		this.player.addListener(webapis.adframework.PlayerAdapter.events.CONNECTION_FAILED, this.internalOnActivePlayerProblem);
		this.player.addListener(webapis.adframework.PlayerAdapter.events.PREBUFFERING_CONNECTION_FAILED, this.internalOnDormantPlayerProblem);

		this.player.addListener(webapis.adframework.PlayerAdapter.events.AUTHENTICATION_FAILED, this.internalOnActivePlayerProblem);
		this.player.addListener(webapis.adframework.PlayerAdapter.events.PREBUFFERING_AUTHENTICATION_FAILED, this.internalOnDormantPlayerProblem);

		this.player.addListener(webapis.adframework.PlayerAdapter.events.STREAM_NOT_FOUND, this.internalOnActivePlayerProblem);
		this.player.addListener(webapis.adframework.PlayerAdapter.events.PREBUFFERING_STREAM_NOT_FOUND, this.internalOnDormantPlayerProblem);

		this.player.addListener(webapis.adframework.PlayerAdapter.events.NETWORK_DISCONNECTED, this.internalOnActivePlayerProblem);
		this.player.addListener(webapis.adframework.PlayerAdapter.events.PREBUFFERING_NETWORK_DISCONNECTED, this.internalOnDormantPlayerProblem);
		this.player.addListener(webapis.adframework.PlayerAdapter.events.RENDERING_START, this.internalOnRenderingStart);
		this.player.addListener(webapis.adframework.PlayerAdapter.events.RENDERING_COMPLETE, this.internalOnRenderingComplete);
		this.player.addListener(webapis.adframework.PlayerAdapter.events.CURRENT_PLAYBACK_TIME, this.internalOnCurrentPlaytime);
		this.player.addListener(webapis.adframework.PlayerAdapter.events.STREAM_INFO_READY, this.internalOnStreamReady);
		this.player.addListener(webapis.adframework.PlayerAdapter.events.DISPLAY_AREA_CHANGED, this.internalDisplayAreaChanged);
                //React to VPAID linearity changes
        webapis.adframework.events.addListener(webapis.adframework.events.VPAID_LINEARITY_CHANGE, this.processVPAIDLinearityChange);
        webapis.adframework.events.addListener(webapis.adframework.events.VPAID_LINEAR_PLAYBACK_TIME, this.internalOnCurrentPlaytime);
	};
		//*******************************************************************************************************
	/**
	 * If the display area has changed, determine if we should fire a tracking event
	 * @param  {webapis.adframework.Event.events} evt
	 * @param  {O} params
	 * @return {[type]}
	 */
	/**
	* @fn		internalDisplayAreaChanged
	* @brief	
	*
	* @param[in]/[out]	: evt
	*					: params
	* @return			: Obj.prototype.internalDisplayAreaChanged =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.internalDisplayAreaChanged = function(evt, params) {
		if(self.state.isLinearAdMode() && !webapis.adframework.VisualOverlay.VPAIDWrapper) {
			var diffW = params.w - params.oldw;
			if(diffW > 30) {
				if(params.w > 955 && params.oldw < 955) {
					self.onLinearAdFullscreen();
				}
			}
			else if(diffW < -30 && params.w < 955 && params.oldw > 955) {
					self.onLinearAdExitFullscreen();
				}
			
			else {
			; /*NULL*/
		}
		}
	};
		//If the current video completes rendering, handle stuff
	/**
	* @fn		sendAdTypeEvent
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.sendAdTypeEvent =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.sendAdTypeEvent = function()	{
		var adType = this.state.currentAdType();
		var adTypeStr = "";
		
		switch(adType)	{
		
			case webapis.adframework.MediaState.AdType.PREROLL:
				adTypeStr = "preroll";
				break;
				
			case webapis.adframework.MediaState.AdType.POSTROLL:
				adTypeStr = "postroll";
				break;
				
			case webapis.adframework.MediaState.AdType.MIDROLL:
			case webapis.adframework.MediaState.AdType.EVENT:
				adTypeStr = "midroll";
				break;
				
			default:
				break;
		}
		
		if(adTypeStr !== "") {
			webapis.adframework.events.dispatch(webapis.adframework.events.PLAYBACK_TYPE, { type: adTypeStr });
		}
	};
	
	//If the current video completes rendering, handle stuff
	/**
	* @fn		internalOnRenderingStart
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.internalOnRenderingStart =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.internalOnRenderingStart = function() {
		if(self.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT) {
			webapis.adframework.events.dispatch(webapis.adframework.events.CONTENT_START, { ms: self.state.getCurrentContentPlayTime(), url: self.state.currentContentVideoURL()});
		}
		else if(self.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD) {
			self.sendAdTypeEvent();

			webapis.adframework.events.dispatch(webapis.adframework.events.LINEAR_AD_START, { skippable: self.state.currentLinearCreative().isSkippable(), url: self.state.currentVideoURL(), icons: self.state.currentLinearCreative().getIcons(), adID: self.state.currentLinearAd().uid, isVPAID: false});
		}
		else {
			self.error("Could not determine playback type: " + self.state.currentPlaybackType());
		}
	};
	
	//If the current video completes rendering, handle stuff
	/**
	* @fn		internalOnRenderingComplete
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.internalOnRenderingComplete =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.internalOnRenderingComplete = function() {
		if(self.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT) {
			self.info(" [internalOnRenderingComplete] Calling stop for main content ");
			self.onItemEnd();
		}
		else if(self.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD) {
			self.info(" [internalOnRenderingComplete] Calling stop for ad ");
			self.onLinearAdComplete();
			self.currentAdCallback();
		}
		else {
			self.error("Could not determine playback type: " + self.state.currentPlaybackType());
		}
	};
	
	//A problem has occurred on the active player. If the active video is an ad, we must fire the appropriate error trackers and move onto the next ad.
	/**
	* @fn		internalOnActivePlayerProblem
	* @brief	
	*
	* @param[in]/[out]	: evt
	*					: params
	* @return			: Obj.prototype.internalOnActivePlayerProblem =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.internalOnActivePlayerProblem = function(evt, params) {

		self.log("internalOnActivePlayerProblem");
		var logMessage = evt + " | " + self.state.currentPlaybackType();
		if (evt === webapis.adframework.PlayerAdapter.events.RENDER_ERROR) {
			logMessage += (" | " + params.code + " | " + params.message);
		}
		self.log(logMessage);

		if (self.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT) {


			//An error on the active player during content playback is a terrible error because unlike ads, we can't just skip it.
			//What we do is we try to restart the content from the point of the error. If we cannot restart the content, we must tell the app developer that playback has encountered an unrecoverable error.
			if (self.state.canRetryPlayback()) {
				webapis.adframework.events.dispatch(webapis.adframework.events.RECOVERABLE_PLAYBACK_ERROR, {
					type: evt,
					message: "Content playback error, attempting to retry..."
				});
				self.player.stop();
				self.state.currentVideoURL(null);
				self.playOrResumeContent();
			} else {
				webapis.adframework.events.dispatch(webapis.adframework.events.UNRECOVERABLE_PLAYBACK_ERROR, {
					type: evt,
					message: "Failed to recover from content playback error. Giving up..."
				});
				self.player.stop();
				self.resetState();
				webapis.adframework.events.dispatch(webapis.adframework.events.STOPPEDALL, {});

			}
		} else if (self.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD) {

			if (self.state.linearAdTimeout()) {
				clearTimeout(self.state.linearAdTimeout());
				self.state.linearAdTimeout(null);
			}

			var errorCode = 400;
			var errorMessage = "Unknown linear ad rendering error";
			if (evt === webapis.adframework.PlayerAdapter.events.RENDER_ERROR) {
				if (params.code === 1 || params.code === 2 || params.code === 3 || params.code === 4) {
					errorCode = 405;
					errorMessage = params.message;
				}
			} else if (evt === webapis.adframework.PlayerAdapter.events.CONNECTION_FAILED) {
				errorCode = 401;
				errorMessage = "Connection failed; MediaFile URI not valid";
			} else if (evt === webapis.adframework.PlayerAdapter.events.AUTHENTICATION_FAILED) {
				errorCode = 400;
				errorMessage = "Authentication failed; Unable to authenticate to MediaFile URI";
			} else if (evt === webapis.adframework.PlayerAdapter.events.STREAM_NOT_FOUND) {
				errorCode = 401;
				errorMessage = "Stream not found; Unable to play MediaFile stream";
			} else if (evt === webapis.adframework.PlayerAdapter.events.NETWORK_DISCONNECTED) {
				errorCode = 400;
				errorMessage = "Client network connection has disconnected";
			}
			else {
			; /*NULL*/
		}

			webapis.adframework.events.dispatch(webapis.adframework.events.RECOVERABLE_PLAYBACK_ERROR, {
				type: evt,
				message: "Ad playback error: " + errorMessage
			});

			self.handleVSuitePlaybackError(self.state.currentAdBreak(), self.state.currentLinearAd(), errorCode, errorMessage, self.state.currentContentPlayhead(), self.state.currentLinearAd().getLinearCreative().getOptimalMediaFile().getURL());
			self.state.currentLinearAd().setErrored();
			self.player.stop();
			self.currentAdCallback();
		}
		else {
			; /*NULL*/
		}
	};

	//A problem has occurred on the dormant (prebuffering) player. If the prebuffering video was an ad, we must fire the appropriate error trackers and move onto the next ad.
	/**
	* @fn		internalOnDormantPlayerProblem
	* @brief	
	*
	* @param[in]/[out]	: evt
	*					: params
	* @return			: Obj.prototype.internalOnDormantPlayerProblem =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.internalOnDormantPlayerProblem = function(evt, params) {

		self.log("internalDormantPlayerProblem");
		var logMessage = evt + " | " + self.state.currentPlaybackType();
		if (evt === webapis.adframework.PlayerAdapter.events.PREBUFFERING_RENDER_ERROR) {
			logMessage += (" | " + params.code + " | " + params.message);
		}
		self.log(logMessage);
		

		if (!self.player.getBufferedVideoURL()) { //False alarm, there is no buffered video (this could have happened if 2 events are thrown for the same problem)
			return false;
		} else if (self.state.prebufferedLinearAd()) { //Buffered video was an ad
			self.log("buffered ad fault: " + self.player.getBufferedVideoURL());
			var errorCode = 400;
			var errorMessage = "Unknown linear ad rendering error";
			if (evt === webapis.adframework.PlayerAdapter.events.PREBUFFERING_RENDER_ERROR) {
				if (params.code === 1 || params.code === 2 || params.code === 3 || params.code === 4) {
					errorCode = 405;
					errorMessage = params.message;
				}
			} else if (evt === webapis.adframework.PlayerAdapter.events.PREBUFFERING_CONNECTION_FAILED) {
				errorCode = 401;
				errorMessage = "Connection failed; MediaFile URI not valid";
			} else if (evt === webapis.adframework.PlayerAdapter.events.PREBUFFERING_AUTHENTICATION_FAILED) {
				errorCode = 400;
				errorMessage = "Authentication failed; Unable to authenticate to MediaFile URI";
			} else if (evt === webapis.adframework.PlayerAdapter.events.PREBUFFERING_STREAM_NOT_FOUND) {
				errorCode = 401;
				errorMessage = "Stream not found; Unable to play MediaFile stream";
			} else if (evt === webapis.adframework.PlayerAdapter.events.PREBUFFERING_NETWORK_DISCONNECTED) {
				errorCode = 400;
				errorMessage = "Client network connection has disconnected";
			}
			else {
			; /*NULL*/
		}

			webapis.adframework.events.dispatch(webapis.adframework.events.RECOVERABLE_PLAYBACK_ERROR, {
				type: evt,
				message: "Buffered ad playback error: " + errorMessage
			});

			self.handleVSuitePlaybackError(self.state.prebufferedLinearAdBreak(), self.state.prebufferedLinearAd(), errorCode, errorMessage, self.state.currentContentPlayhead(), self.state.prebufferedLinearAd().getLinearCreative().getOptimalMediaFile().getURL());
			self.state.prebufferedLinearAd().setErrored();
			self.state.prebufferedLinearAd(null);
			self.state.prebufferedLinearAdBreak(null);
			self.player.cancelBufferedVideo();
		} else { //Buffered video was content

			webapis.adframework.events.dispatch(webapis.adframework.events.RECOVERABLE_PLAYBACK_ERROR, {
				type: evt,
				message: "Buffered content playback error, attempting to retry..."
			});

			//Sometimes there are multiple events thrown upon an error. We don't want to necessarily stop video playback because of this. Instead, we just clear the buffer and hope for the best.
			self.player.cancelBufferedVideo();
		}
	};

	//Handles time updates from the player.
	/**
	* @fn		internalOnCurrentPlaytime
	* @brief	
	*
	* @param[in]/[out]	: event
	*					: params
	* @return			: Obj.prototype.internalOnCurrentPlaytime =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.internalOnCurrentPlaytime = function(event, params) {
		if (!params.ms) {
			return;
		} //Sometimes the SEF player is too jumpy and gives a playtime value of 0. We want to ignore that.

		var time = parseInt(params.ms);
		if(self.state.currentPlayhead() && self.state.currentPlayhead() === time) {
			return; //Makes sure the time actually changed before triggering callbacks
		}
		self.state.currentPlayhead(time);
		if(self.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT) {
			self.onContentCurrentPlayTime(params.ms);
		}
		else if(self.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD) {
			self.onAdCurrentPlayTime(params.ms);
		}
		else {
			; /*NULL*/
		}
	};
	
	/**
	* @fn		internalOnStreamReady
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.internalOnStreamReady =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.internalOnStreamReady = function(){
		if(self.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT) {
			var duration = self.state.contentDuration();
			if(!duration || duration <= 0){  //Initialize main content parameters
				self.state.contentDuration(self.player.getDuration());
				self.state.hasContentVideo(self.player.hasVideo(STREAM_VIDEO));
				self.state.hasContentAudio(self.player.hasAudio(STREAM_AUDIO));
				self.state.hasContentCaption(self.player.hasCaptions(STREAM_INTERNAL_SUBTITLE));
			}
		}
		else if(self.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD && !this.isCompanionRendered) {
			self.companionDisplay(self.state.currentLinearAd());
		}
		else {
			; /*NULL*/
		}
	};
	

	//Initialize the player with Content URL and an ad schedule.
	//Params can either be a String representing VAST/VMAP, or it could be a map with several properties.
	/**
	* @fn		initPlayer
	* @brief	
	*
	* @param[in]/[out]	: url
	*					: params
	* @return			: Obj.prototype.initPlayer =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initPlayer = function(url, params) {
		if (!self.player) {
			self.initialize();
		} //If the developer forgot to initialize, let's do it for them

		this.resetState();
		this.state.currentContentVideoURL(webapis.adframework.utils.getVODUrl(url));
		
		if(params) {
			var adXMLURL = null;
			if(typeof params === "string") {
				adXMLURL = params;
			}
			else {
				if(!params.adURL) { 
					return false; 
				}
				adXMLURL = params.adURL;
			}
			this.scheduler.insertAdBreak(adXMLURL, params);
		}
	};

	//*******************************************************************************************************
	//SCHEDULING
	//*******************************************************************************************************
	//Inserts a linear ad into the scheduler.
	/**
	* @fn		insertAdBreak
	* @brief	
	*
	* @param[in]/[out]	: url
	*					: params
	* @return			: Obj.prototype.insertAdBreak =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.insertAdBreak = function(url, params) {
		this.scheduler.insertAdBreak(url ,params);
	};
	
	//This function is called at the end of a midroll. It causes the resumption of the content if we are currently playing a linear ad.
    Obj.prototype.resumeFromMidroll = function() {
        if (this.state.currentPlaybackType() !== webapis.adframework.MediaState.PlaybackType.CONTENT) {
            this.playOrResumeContent();
        }
    };
	
	//To start/resume main content after playback of prerolls and midrolls
	/**
	* @fn		playMainContent
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.playMainContent =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.playMainContent = function(){
		
		this.breakDur = this.state.currentBreakDuration() + this.state.currentContentPlayhead();
		this.state.resetAdState();
		this.setContentMode();
		this.foundBreak = false;
		//In case of main content's pause state, if any linear ad playback happens (whether event or property), it will keep  main content in pause state and prebuffer it also
		//adonpause set as true here to invoke playmaincontent rather than uniplayer's resume on pressing Resume Button in scenarios where linear ad playback happened in main content's "Paused" state
		if(this.state.contentState() === webapis.adframework.PlayerAdapter.State.PAUSED ) {
			this.adOnPause = true;
			this.tryBufferingContent();
		}
		else {
			this.state.contentState(webapis.adframework.PlayerAdapter.State.PLAYING);
			this.playOrResumeContent();
			webapis.adframework.events.dispatch(webapis.adframework.events.STREAM_TYPE, { 
				type: webapis.adframework.utils.detectVideoType(this.state.currentContentVideoURL()) 
			});
		}
	};
	
    //Adds a function to execute each time before the content starts. The function is passed a reference to the player object that will play content.
   Obj.prototype.beforeContentStart = function(func) {
        self.state.beforeContentStart(func);
    };
	
    //Adds a function to execute each time after the content starts. The function is passed a reference to the player object that will play content.
    Obj.prototype.afterContentStart = function(func) {
        self.state.afterContentStart(func);
    };

    //Adds a function to execute each time before a linear ad starts. The function is passed a reference to the player object that will play content.
    Obj.prototype.beforeLinearAdStart = function(func) {
        self.state.beforeLinearAdStart(func);
    };

    //Adds a function to execute each time after a linear ad starts. The function is passed a reference to the player object that will play content.
    Obj.prototype.afterLinearAdStart = function(func) {
        self.state.afterLinearAdStart(func);
    };	
	
	//For playback of pre rolls based on property conditions
	/**
	* @fn		startPlayback
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.startPlayback =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.startPlayback = function() {
		//For preroll, playtime and duration of main content will be undefined or 0
		var adBreakToBePlayedFirst = this.scheduler.getNextUnplayedTrigger();
		 //Disable Ad Insertion logic
		if (adBreakToBePlayedFirst && webapis.adframework.config.get("DISABLE_AD_INSERTION") === true) {
			webapis.adframework.events.dispatch("DEBUG_MESSAGE", {
				message: "Skipping ad break: Ad insertion has been disabled"
			});
		this.scheduler.checkRepeatingAdBreak(adBreakToBePlayedFirst);
			adBreakToBePlayedFirst.setSkipped();
			adBreakToBePlayedFirst = null;
		}
		if(adBreakToBePlayedFirst) {
			//Play prerolls first, then come back to this function
			webapis.adframework.events.dispatch(webapis.adframework.events.ADBREAK_START, {
				triggerTime: 0,
				extensions: adBreakToBePlayedFirst._extensions.local,
				globalExtensions: adBreakToBePlayedFirst._extensions.global
			});
			
			this.playAdBreak(adBreakToBePlayedFirst, this.startPlayback);
			this.scheduler.checkRepeatingAdBreak(adBreakToBePlayedFirst);
			
		
			
		}
		else {
			//Start playback, no more prerolls to be displayed
			this.state.resetAdState();
			this.playMainContent();
		}
	};
	
	
	//For playback of postrolls based on property conditions
	/**
	* @fn		endPlayback
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.endPlayback =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.endPlayback = function() {
		this.state.currentContentVideoURL(null);		
		var adBreakToBePlayedFirst = this.scheduler.getNextUnplayedTrigger();
		
		//Disable Ad Insertion logic
		if (adBreakToBePlayedFirst && webapis.adframework.config.get("DISABLE_AD_INSERTION") === true) {
				webapis.adframework.events.dispatch("DEBUG_MESSAGE", {
					message: "Skipping ad break: Ad insertion has been disabled"
				});
				adBreakToBePlayedFirst.setSkipped();
				adBreakToBePlayedFirst = null;
		}
		
		if(adBreakToBePlayedFirst) {
			//Play postrolls first, then come back to this function
			this.playAdBreak(adBreakToBePlayedFirst, this.endPlayback);	
			webapis.adframework.events.dispatch(webapis.adframework.events.ADBREAK_START, {
				extensions: adBreakToBePlayedFirst._extensions.local,
				globalExtensions: adBreakToBePlayedFirst._extensions.global
			});
		}
		else {
			//Stop playback, no more postrolls to be displayed
			this.setContentMode();
			this.state.contentState(webapis.adframework.PlayerAdapter.State.STOPPED);
			webapis.adframework.events.dispatch(webapis.adframework.events.PLAYBACK_TYPE, { type: "none" });
			webapis.adframework.events.dispatch(webapis.adframework.events.PLAYBACK_COMPLETE, { });
			this.resetState();
			webapis.adframework.events.dispatch(webapis.adframework.events.STOPPEDALL, {});
		}
	};
	
	//For event based ad playback during preroll and postroll
	/**
	* @fn		playbackEvents
	* @brief	
	*
	* @param[in]/[out]	: event
	* @return			: Obj.prototype.playbackEvents =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.playbackEvents = function(event) {

		var adBreakToBePlayedFirst = this.scheduler.getNextEventTrigger(event);
		//Disable Ad Insertion logic
		if(adBreakToBePlayedFirst && webapis.adframework.config.get("DISABLE_AD_INSERTION") === true) {
			webapis.adframework.events.dispatch("DEBUG_MESSAGE", {
				message: "Skipping ad break: Ad insertion has been disabled"
			});
			adBreakToBePlayedFirst.setSkipped();
			adBreakToBePlayedFirst = null;
		}
		
		if(adBreakToBePlayedFirst) {
			if (adBreakToBePlayedFirst.getNextAd() && adBreakToBePlayedFirst.getNextAd().getLinearCreative()) {
				if( webapis.adframework.MediaState.AdType.PREROLL ===  this.state.currentAdType()){
					webapis.adframework.events.dispatch(webapis.adframework.events.ADBREAK_START, {
						triggerTime: 0,
							extensions: adBreakToBePlayedFirst._extensions.local,
							globalExtensions: adBreakToBePlayedFirst._extensions.global
					});
				}
				else if( webapis.adframework.MediaState.AdType.POSTROLL === this.state.currentAdType()){
					webapis.adframework.events.dispatch(webapis.adframework.events.ADBREAK_START, {
						extensions: adBreakToBePlayedFirst._extensions.local,
						globalExtensions: adBreakToBePlayedFirst._extensions.global
					});
				}
				else {
			; /*NULL*/
		}
			}
			this.playAdBreak(adBreakToBePlayedFirst, this.playbackEvents);
		} else {
			var adMode = this.state.currentAdType();
			this.state.resetAdState();
			if( webapis.adframework.MediaState.AdType.PREROLL ===  adMode){
				this.initiateStartPlay();
			}
			else if( webapis.adframework.MediaState.AdType.POSTROLL === adMode){
				this.onItemEnd();
			}
			else {
			; /*NULL*/
		}
		}
	};
	
	//For ad playback based on events triggered by user during main content playback
	/**
	* @fn		onTriggerEvent
	* @brief	
	*
	* @param[in]/[out]	: event
	* @return			: Obj.prototype.onTriggerEvent =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onTriggerEvent = function(event) {
		var adBreakToBePlayedFirst = this.scheduler.getNextEventTrigger(event);
		 //Disable Ad Insertion logic
		if (adBreakToBePlayedFirst && webapis.adframework.config.get("DISABLE_AD_INSERTION") === true) {
			webapis.adframework.events.dispatch("DEBUG_MESSAGE", {
				message: "Skipping ad break: Ad insertion has been disabled"
			});
			adBreakToBePlayedFirst.setSkipped();
			adBreakToBePlayedFirst = null;
        }
		if(adBreakToBePlayedFirst && this.foundBreak === false) {
			//Play prerolls first, then come back to this function
			if(this.isEventTriggerPlay === false){
				this.foundBreak = true;
				this.state.currentAdType(webapis.adframework.MediaState.AdType.EVENT);
				this.isEventTriggerPlay = true;
			}				
			this.playAdBreak(adBreakToBePlayedFirst, this.onTriggerEvent);		
		}
		else if( this.isEventTriggerPlay === true ) {
			this.isEventTriggerPlay = false;
			this.takeActionForEvent();
			this.foundBreak = false;
		}
		else{
			;
		}
		
		return this.isEventTriggerPlay;
	};

	//After playback of event based ad breaks, take action as per the event triggered. 
	/**
	* @fn		takeActionForEvent
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.takeActionForEvent =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.takeActionForEvent = function(){
	
		var currEvent = this.state.currentEvent();
		this.state.resetAdState();
		
		if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD)
		{
			switch(currEvent)
			{
				case Obj.MEvents.OnVolumeChange:
				case Obj.MEvents.OnFullScreenChange:
				case Obj.MEvents.OnMute:
					this.playMainContent();
					break;

				case Obj.MEvents.OnPlay: 
					this.adOnPause = false;
					this.state.contentState(webapis.adframework.PlayerAdapter.State.PLAYING);
					this.playMainContent();
					break;
					
				case Obj.MEvents.OnSeek:
					this.playMainContent();
					this.state.contentSeekTime(0);  
					break;
					
				case Obj.MEvents.OnStop:
					this.setContentMode();
					this.state.contentState(webapis.adframework.PlayerAdapter.State.STOPPED);
					this.player.stop();
					webapis.adframework.events.dispatch(webapis.adframework.events.PLAYBACK_COMPLETE, { });
					this.player.stopDormantPlayer();
					this.resetState();
					webapis.adframework.events.dispatch(webapis.adframework.events.STOPPEDALL, {});
					break;

				case Obj.MEvents.OnPause:	
                    this.player.stop();	
					this.setContentMode();
					this.state.contentState(webapis.adframework.PlayerAdapter.State.PAUSED);
					webapis.adframework.events.dispatch(webapis.adframework.events.CONTENT_PAUSE, " ");		//To maintain application's pause state
                    this.tryBufferingContent();
					break;
					
				default:
					break;
			}
		}
	};
	
	//This is invoked by application when play button is pressed.
	/**
	* @fn		startPrerolls
	* @brief	
	*
	* @param[in]/[out]	: playhead
	* @return			: Obj.prototype.startPrerolls =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.startPrerolls = function(playhead) {

		if(typeof playhead === "number" && playhead > 1000) {
			this.state.currentContentPlayhead(playhead); //Save the playhead so when we resume, it starts there
			this.state.startPlaybackTime(playhead);
		}
		this.scheduler.whenReady(this.initiateStartPlay); //Waits for the schedule to be ready initializing its VAST/VMAP.
	};
	
	//To initiate event or property based prerolls before main content
	/**
	* @fn		initiateStartPlay
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.initiateStartPlay =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initiateStartPlay = function() {
		self.state.currentAdType(webapis.adframework.MediaState.AdType.PREROLL);

		var event = self.scheduler.getNextEvent(webapis.adframework.MediaState.AdType.PREROLL);
		if(event)
		{
			self.scheduler.setPrerollEventPlayed(event);
			self.playbackEvents(event);
			return;
		}
		self.startPlayback();
	};
	
	//To initiate postrolls based on property or events after the main content comes to end
	/**
	* @fn		onItemEnd
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onItemEnd =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onItemEnd = function() {
		this.state.currentAdType(webapis.adframework.MediaState.AdType.POSTROLL);

		var event = this.scheduler.getNextEvent(webapis.adframework.MediaState.AdType.POSTROLL);
		if(event)
		{
			this.scheduler.setPostrollEventPlayed(event);			
			this.playbackEvents(event);
			return;
		}
		this.endPlayback();
	};
	
    //Stops video playback cold, but does NOT reset the state of the ad framework. Content can be resumed.
    //Used before a NonLinear VPAID ad switches to Linear mode.
    Obj.prototype.processVPAIDLinearityChange = function(evt, params) {
	
		var linearCreative = null;
		
        if (self.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD &&
            params.isLinear === false) {
			//Do Nothing
			;
        } else if (self.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT &&
            params.isLinear === true) {
            self.player.stop();
			self.state.currentVideoURL(null);
			//For switching to linear Mode, need to send LinearCreative 
			if(params.wrapper._type === "linear"){
				linearCreative = params.wrapper.getInternalCreative();
			}
			else if(params.wrapper._type === "nonlinear"){
				self.state.currentAdBreak(self.state.currentNonLinearAdBreak());
				self.state.currentEvent(self.state.currentNonLinearAdBreak().triggerEventType());
			}
			else {
			; /*NULL*/
		}
            self.state.switchToLinearAdMode(params.wrapper.getInternalAd(), linearCreative);
            self.state.hasHaltedForVPAID(true);
        } else {
            var linearString = params.isLinear ? "linear" : "nonlinear";
            self.log("Invalid VPAID linearity change to " + linearString + " while playback type is " + self.state.currentPlaybackType());
        }
    };

	
	//Stops video playback and trigger ad breaks if any for stop event. Will reset the state of the ad framework.
	/**
	* @fn		stop
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.stop =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.stop = function() {
	
		if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD && webapis.adframework.VisualOverlay.VPAIDWrapper) {
			//Stop the VPAID Ad
			var stopPromise = new webapis.adframework.Promise();
			stopPromise.onSuccess(function() {
				webapis.adframework.events.dispatch(webapis.adframework.events.LINEAR_AD_END, {});
				self.player.stop();
				self.resetState();
				webapis.adframework.events.dispatch(webapis.adframework.events.STOPPEDALL, {});
			});
			webapis.adframework.VisualOverlay.VPAIDWrapper.stopAd(stopPromise, true);
			return;
		}
		else if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD) {
			webapis.adframework.events.dispatch(webapis.adframework.events.LINEAR_AD_END, {});
		}
		else if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT) {
			// by amit tyagi
			var playStatus = this.onTriggerEvent(Obj.MEvents.OnStop);
			if( playStatus ){
				return;
			}
			else if(webapis.adframework.VisualOverlay.VPAIDWrapper){
				var stopPromise1 = new webapis.adframework.Promise();
				stopPromise1.onSuccess(function() {
					self.player.stop();
					self.resetState();
					webapis.adframework.events.dispatch(webapis.adframework.events.STOPPEDALL, {});
				});
				webapis.adframework.VisualOverlay.VPAIDWrapper.stopAd(stopPromise1, true);
				this.state.contentState(webapis.adframework.PlayerAdapter.State.STOPPED);
				return;
			}
			else{
				this.state.contentState(webapis.adframework.PlayerAdapter.State.STOPPED);
			}
		}
		else {
			; /*NULL*/
		}
		this.info(" Calling stop from stop function ");
		this.player.stop();
		this.resetState();
		webapis.adframework.events.dispatch(webapis.adframework.events.STOPPEDALL, {});
	};
	
	//Toggles the mute on/off. If a Boolean value is provided as the first argument, 'true' will mute, 'false' will unmute.
	/**
	* @fn		toggleMute
	* @brief	
	*
	* @param[in]/[out]	: mute
	* @return			: Obj.prototype.toggleMute =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.toggleMute = function(mute) {
		
		if(typeof mute !== "boolean") {
			mute = !this.state.isMuted(); 
		}
		
		if(mute === true) {
			this.log("toggleMute : Mute");
			if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD) {
				if (webapis.adframework.VisualOverlay.VPAIDWrapper) {
					;/*NULL*/
				}
				else{
				this.onLinearAdMute();
			}
			}
			else if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT) {
				this.onTriggerEvent(Obj.MEvents.OnMute);
			}
			else {
			; /*NULL*/
			}
		}
		else {
			this.log("toggleMute : UnMute");
			if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD) {
				if (webapis.adframework.VisualOverlay.VPAIDWrapper) {
					;/*NULL*/
				}
				else{
				this.onLinearAdUnmute();
			}
			}
			else if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT) {
					; /*NULL*/
			}
			else {
			; /*NULL*/
		}
		}
		this.state.isMuted(mute);
		return mute;
	};
	//Pauses the current playback and triggers advertisements if any on pause event during main content playback
	/**
	* @fn		pause
	* @brief	
	*
	* @param[in]/[out]	: isAdClick
	* @return			: Obj.prototype.pause =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.pause = function(isAdClick) {
		var pause_status = false;
		if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.STOPPED) {  
			this.log("current stopped; aborting pause..."); 
			return pause_status; 
		}
		else if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD) {
			/** Pause VPAID */
			if (webapis.adframework.VisualOverlay.VPAIDWrapper) {
				webapis.adframework.VisualOverlay.VPAIDWrapper.pauseAd();
				return true;
			}
	
			//If already paused, just return.. Let it be in pause state
			if( this.player.state() === webapis.adframework.PlayerAdapter.State.PAUSED ){
				if(isAdClick === true){
					this.pauseOnClick = true;
				}
				pause_status = false;
			}
			else if(this.player.pause() === 1) {
				this.onLinearAdPause();
				pause_status = true;
			}
			else {
				pause_status = false;
			}
		}
		else if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT) {
			//If already paused, just return.. Let it be in pause state
			if(this.state.contentState() === webapis.adframework.PlayerAdapter.State.PAUSED ) {
				if(isAdClick === true){
					this.pauseOnClick = true;
				}
				pause_status =  true;
			}
			else
			{
				var playStatus =false;
				if(isAdClick !== true){		//No triggering of ads when paused in case of companion click
					playStatus = this.onTriggerEvent(Obj.MEvents.OnPause);	
				}
				if( playStatus ){
					this.adOnPause = true;
					pause_status = false;
				}
				else if(this.player.pause() === 1) {
					this.state.contentState(webapis.adframework.PlayerAdapter.State.PAUSED);
					
					var nonLinearAdParam = this.state.getCurrentNonLinearAd();
					var nonLinearCreative = null;
					if (nonLinearAdParam && nonLinearAdParam.isShown === false && nonLinearAdParam.ad) {
						nonLinearCreative = nonLinearAdParam.ad.getNonLinearCreative();
						if (nonLinearCreative) {
							this.playNonLinearAd();
						}
					}
					pause_status = true;
				}
				else {
					pause_status = false;
				}	
			}
		}
		else {
				; /*NULL*/
			}
		return pause_status;
	};
	
	//Resumes the paused content and triggers advertisements if any on play event 
	/**
	* @fn		resume
	* @brief	
	*
	* @param[in]/[out]	: isAdClick
	* @return			: Obj.prototype.resume =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.resume = function(isAdClick) {
		var playStatus = false;
		if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.STOPPED) {
			this.log("current stopped; aborting resume..."); 
			return false; 
		}
	
		if(isAdClick === true && this.pauseOnClick){
			this.pauseOnClick = false;
			return false;
		}
		
		if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD) {
			/** Resume VPAID */
			if (webapis.adframework.VisualOverlay.VPAIDWrapper) {
					webapis.adframework.VisualOverlay.VPAIDWrapper.resumeAd();
					return true;
			}
			
			if(this.player.state() === webapis.adframework.PlayerAdapter.State.PAUSED){
				if(this.player.resume() === 1) {
					this.onLinearAdResume();
					return true;
				}
				else {
					return false;
				}
				
			}
			return false;
		}
		else if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT &&
			this.state.contentState() === webapis.adframework.PlayerAdapter.State.PAUSED ) {
			if(isAdClick !== true) {
				playStatus = this.onTriggerEvent(Obj.MEvents.OnPlay);
				if( playStatus ) {
					return true;
				}
					
				// Added By amit 
				//adonpause to be reset to false
				//In case on main content's pause state, if any non linear(property)is found, it will set adonpause as true
				// But current url will be as main content's so DONT CALL playmaincontent(), call resume
				//In case of main content's pause state, if any non linear vpaid is found and if any ad is clicked, processVPAIDLinearityChange set currentVideoURL to null, so playmaincontent() should be invoked in that case
				if(this.adOnPause === true) {
				        this.adOnPause = false;
					
					var vodUrl = this.state.currentContentVideoURL();
					if(!this.state.currentVideoURL() || 
					(!(this.state.currentVideoURL().indexOf(vodUrl) >= 0)))
					{
						this.state.contentState(webapis.adframework.PlayerAdapter.State.PLAYING);
						this.playMainContent();
						return true;
					}
				}
			}
			if(this.player.resume() === 1) {
				this.state.contentState(webapis.adframework.PlayerAdapter.State.PLAYING);
				return true;
			}
			else {
				return false;
			}
		}
		else {
			; /*NULL*/
		}
	};
	
	//Skipping forward behaves differently between ads and content.
	//In Content, it simply forwards the number of seconds specified.
	//In Ad mode, it cannot fast forward, unless the current linear ad is skippable. Then it skips the whole ad.
	/**
	* @fn		jumpForward
	* @brief	
	*
	* @param[in]/[out]	: seconds
	* @return			: Obj.prototype.jumpForward =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.jumpForward = function(seconds) {
		if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.STOPPED) {
			this.log("current stopped; aborting jumpForward..."); 
			return;
		}
		else if (this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD && webapis.adframework.VisualOverlay.VPAIDWrapper) {
				//Check the VPAID wrapper for skippability
				webapis.adframework.VisualOverlay.VPAIDWrapper.skipAd();
		}
		else if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD) {
			if(this.state.currentLinearCreative().isSkippable() && this.state.currentLinearCreative().canSkipNow(this.state.currentPlayhead(), this.player.getDuration())) 
			{
				this.onLinearAdSkip();
				this.state.currentLinearAd().setSkipped();
				this.player.stop();
				if(typeof this.currentAdCallback === "function") 
				{
					this.currentAdCallback();
				}
				else 
				{
					; /*NULL*/
				}
			}
			else 
			{
				; /*NULL*/
			}
		}
		else if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT) {
			
			var playStatus = this.onTriggerEvent(Obj.MEvents.OnSeek);
			if( playStatus ){
				this.state.contentSeekTime(seconds * 1000);
				return;
			}	
			
			this.player.jumpForward(seconds * 1000);
		}
		else {
			; /*NULL*/
		}
	};
	
	//This does exactly what you expect it to - go back in time on the current video for X number of seconds.
	/**
	* @fn		jumpBackward
	* @brief	
	*
	* @param[in]/[out]	: seconds
	* @return			: Obj.prototype.jumpBackward =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.jumpBackward = function(seconds) {
		if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.STOPPED) { 
			this.log("currently stopped; aborting jumpBackward..."); 
			return; 
		}
		else if (this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD && webapis.adframework.VisualOverlay.VPAIDWrapper) {
			//Do Nothing.. 
			return;
		}
		else if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD) {
			this.onLinearAdRewind();
		}
		else if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT) {
			var playStatus = this.onTriggerEvent(Obj.MEvents.OnSeek);
			if( playStatus ){
				this.state.contentSeekTime((-1) * seconds * 1000);
				return;
			}	
		}
		else {
			; /*NULL*/
		}
		this.player.jumpBackward(seconds * 1000);
	};
	
	/**
	* @fn		volumeChange
	* @brief	
	*
	* @param[in]/[out]	: mode
	* @return			: Obj.prototype.volumeChange =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.volumeChange = function(mode) {
		
		if(mode === 448) {
			;/*NULL*/
		}
		else{
			;/*NULL*/
		}

		if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.STOPPED) { 
			this.log("current stopped; aborting volumeChange..."); 
			return;
		}
		if (this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD) {
			if( webapis.adframework.VisualOverlay.VPAIDWrapper) {
				if(this.state.isMuted() === true) {
					;/*NULL*/
				}else{
						;/*NULL*/
				}
			}
			else{
				if(this.state.isMuted() === true) {
					this.onLinearAdUnmute();
				}
				else{
					;
				}
			}
		}
		else if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT) {
			this.onTriggerEvent(Obj.MEvents.OnVolumeChange);
		}
		else {
			; /*NULL*/
		}
		this.state.isMuted(false);
	};
	
	/**
	* @fn		setDisplayArea
	* @brief	
	*
	* @param[in]/[out]	: x
	*					: y
	*					: w
	*					: h
	*					: fullscreenMode
	* @return			: Obj.prototype.setDisplayArea =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setDisplayArea = function(x,y,w,h, fullscreenMode, user) {
		
		var param = {
				x: x,
				y: y,
				w: w,
				h: h
			};
			
		this.state.contentDisplayArea(param);
		
		if (this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD && webapis.adframework.VisualOverlay.VPAIDWrapper) {
				//Check the VPAID wrapper for skippability
			webapis.adframework.VisualOverlay.VPAIDWrapper.resizeAd(param.w, param.h);
			this.player.setTargetArea(webapis.adframework.PlayerAdapter.DisplayArea.NONE, param);
			this.state.isFullscreen(fullscreenMode);
			return;
		}
		else if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD) {
			this.info("Set Display Area for Ad Type ");
			this.player.setTargetArea(this.state.currentAdRegion(), param);
			if(this.state.isFullscreen() && user === true){
				this.onLinearAdCollapse();
			}
			else if(user === true){
				this.onLinearAdExpand();
			}
			else{
				;
			}
		}
		else if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT) {
			if(this.state.currentAdType() === webapis.adframework.MediaState.AdType.NONE){
				var playStatus = this.onTriggerEvent(Obj.MEvents.OnFullScreenChange);
				if( playStatus ){
					this.state.isFullscreen(fullscreenMode);
					return;
				}
			}
			this.player.setTargetArea(webapis.adframework.PlayerAdapter.DisplayArea.NONE, param);
		}
		else{
			;
		}
		this.state.isFullscreen(fullscreenMode);
	};

	/**
	* @fn				: setOffsetContentPlayheadTime
	* @brief	
	*
	* @param[in]/[out]	: ms
	* @return			: None
	* @warning			: None
	* @exception		: None
	* @see
	*/
	//Offset the content playhead by N seconds. If currently playing item is CONTENT, just jumpForward. If currently playing item is AD, then change the content playhead for when the resume happens.
    Obj.prototype.setOffsetContentPlayheadTime = function(ms) {
    
    	if( ms === null || typeof ms === "undefined"){
    		return;
    	}
        if(typeof ms !== "number") {
            log(ms + " is not a number; aborting jump");
        }
        //If content is currently playing, just jump forward
        if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT) {
            var seconds = ms/1000;
            if(ms > 0) {
                this.jumpForward(seconds);
            }
            else {
                this.jumpBackward(seconds);
            }
        }
        //If content isn't playing, just add the number of seconds to the playhead.
        else {
            var currentContentPlayhead = this.state.currentContentPlayhead();
            if(typeof(currentContentPlayhead) !== "number") {
                currentContentPlayhead = 0;
            }

            currentContentPlayhead += ms;
            if(currentContentPlayhead < 0) {
                currentContentPlayhead = 0;
            }
            this.state.currentContentPlayhead(currentContentPlayhead);
        }
    };
	
	/**
	* @fn				: setContentPlayheadTime
	* @brief	
	*
	* @param[in]/[out]	: ms
	* @return			: None
	* @warning			: None
	* @exception		: None
	* @see
	*/
    Obj.prototype.setContentPlayheadTime = function(ms) {
    	
    	if( ms === null || typeof ms === "undefined"){
    		return;
    	}
    	
        if(typeof ms !== "number") {
            log(ms + " is not a number; aborting jump");
        }
        var currentContentPlayhead = this.state.currentContentPlayhead();

        if(typeof(currentContentPlayhead) !== "number") {
            currentContentPlayhead = 0;
        }
        var diff = ms - currentContentPlayhead;
        this.setOffsetContentPlayheadTime(diff);
    };
	
	//Takes an adBreak and plays the list of ads.
	/**
	* @fn		playAdBreak
	* @brief	
	*
	* @param[in]/[out]	: adBreak
	*					: callback
	* @return			: Obj.prototype.playAdBreak =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.playAdBreak = function(adBreak, callback) {
		this.state.currentAdBreak(adBreak);
		adBreak.setPlayed();	//To handle scenarios where this function is not called for all ads of adBreak
		
		var nextAd = adBreak.getNextAd();
		
		if(nextAd) {
            var callbackFunc;
            if (nextAd.getLinearCreative()) {
                callbackFunc = function() {
					webapis.adframework.events.dispatch(webapis.adframework.events.LINEAR_AD_END, { });
					self.state.currentBreakDuration(self.state.currentAdPlayhead());
					self.playAdBreak(adBreak, callback);
                };
            } 
            else {
                callbackFunc = function() {
					self.playAdBreak(adBreak, callback);
                };
            }
			this.playSingleAd(nextAd, callbackFunc);
		}
		else{
			this.resetAdBreak(adBreak, this.state.currentEvent());
			if(adBreak.isNonLinearFound() === true){
				//Prebuffering NonLinear here so that it does not interfere in buffering Linear VPAID if any in this adBreak
				var nonLinearParam = this.state.getCurrentNonLinearAd();
				if(nonLinearParam && nonLinearParam.isVPAID){
					this.prebufferNextVPAIDAd(nonLinearParam.ad, 'nonlinear');
				}
			}
			callback.call(this);
		}
	};
	
	Obj.prototype.resetAdBreak = function(adBreak, curEvent){
		if(adBreak.isNonLinearFound() === false){		//To handle VMAP Breakend tracking event only after the adBreak is completed
			if(adBreak.getOffset().getType() === webapis.adframework.Offset.OffsetType.CONDITIONAL_OFFSET && curEvent &&  curEvent !== webapis.adframework.ContentManager.MEvents.NONE ){
					var param = {
						playhead : 	this.state.currentContentPlayhead(),
						duration :  this.state.contentDuration(),
						event    : 	Obj.MEvents.OnItemEnd
					};
					if(this.scheduler.testReinvoke(adBreak, param)){ 
						adBreak.setPlayed("false");
					}
				}
			
		
			this.onAdBreakEnd(adBreak);
			webapis.adframework.events.dispatch(webapis.adframework.events.ADBREAK_END, {});
		}
	};

	//Plays a single ad. A single ad can have a linear creative, nonlinears, and companions.
	/**
	* @fn		playSingleAd
	* @brief	
	*
	* @param[in]/[out]	: ad
	*					: callback
	* @return			: Obj.prototype.playSingleAd =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.playSingleAd = function(ad, callback) {
		var linearCreative = ad.getLinearCreative(); //I'm assuming there can only be one
		var nonLinearCreative = ad.getNonLinearCreative(); //I'm assuming there can only be one
		var companionRequirementFailed = false;

		if (!linearCreative && !nonLinearCreative) {
			this.handleVSuitePlaybackError(this.state.currentAdBreak(), ad, 900, "Ad is missing both Linear and NonLinear creatives; unable to utilize ad", this.state.currentContentPlayhead(), null);
			ad.setErrored();
			callback.call(this);
			return false;
		}
		
		companionRequirementFailed = this.getcompanionRequirement(ad);

        if (nonLinearCreative && !companionRequirementFailed) {
            var variation = nonLinearCreative.getBestVariation();
			var nlParam = null;
			
            if (variation) {
                /** If VPAID, make sure only JS VPAID will be played */
                if (variation.apiFramework === 'VPAID') {
                    if (!webapis.adframework.config.get("VPAID_ENABLE")) {
                        ad.setErrored();
                        this.handleVSuitePlaybackError(this.state.currentAdBreak(), ad, 902, "Ad framework was disabled to Play VPAID [Check config]", this.state.currentContentPlayhead(), null);
                    } else if (variation.getType() !== webapis.adframework.NonLinearResource.ResourceType.STATIC_JS) {
                        ad.setErrored();
                        this.handleVSuitePlaybackError(this.state.currentAdBreak(), ad, 403, "Could not Play non JS VPAID", this.state.currentContentPlayhead(), null);
                    } else {
						
						//Added to discard any non linear rendering in content pause state
						if(this.state.contentState() === webapis.adframework.PlayerAdapter.State.PAUSED && this.state.currentEvent() !== Obj.MEvents.OnPlay) {
							ad.setPlayed();
						}
						else{
						this.resetOldBreak(ad, "nonlinear");
						nlParam = {
							ad: ad,
							isVPAID: true,
							isShown: false,
							isErrored: false
						};
						
						this.state.setNonLinearAd(this.state.currentAdBreak(), nlParam);	//Enqueue the nonlinear ad for its respective break
						this.state.currentAdBreak().nonLinearFound(true);	//To handle VMAP BreakEND tracking event only after the adBreak is completed
						this.state.currentNonLinearAdBreak().triggerEventType(this.state.currentEvent());
                        ad.setPlayed();
                    }
                    }
                } else if (variation.getType() !== webapis.adframework.NonLinearResource.ResourceType.STATIC_JS){
					
					if(this.state.contentState() === webapis.adframework.PlayerAdapter.State.PAUSED && this.state.currentEvent() !== Obj.MEvents.OnPlay) {
						ad.setPlayed();
					}
					else{
					this.resetOldBreak(ad, "nonlinear");
					nlParam = {
						ad: ad,
						isVPAID: false,
						isShown: false,
						isErrored: false
					};
					
					this.state.setNonLinearAd(this.state.currentAdBreak(), nlParam);	//Enqueue the nonlinear ad for its respective break
					this.state.currentAdBreak().nonLinearFound(true);	//To handle VMAP BreakEND tracking event only after the adbreak is completed
					this.state.currentNonLinearAdBreak().triggerEventType(this.state.currentEvent());
					
					if(!this.isCompanionRendered)
					{
						ad.companionFound(true);
					}
					
                    ad.setPlayed();
                }
                }
				else{
					//Error
				}
            } else {
                //TODO: Error because we couldn't find a suitable variation...?
            }
        }
		if (linearCreative && !companionRequirementFailed) {
			var mediaFile = linearCreative.getOptimalMediaFile();

			this.resetOldBreak(ad, "linear");

			if (!mediaFile) {
				ad.setErrored();
				this.handleVSuitePlaybackError(this.state.currentAdBreak(), ad, 403, "Could not find a valid MediaFile", this.state.currentContentPlayhead(), null);
				callback.call(this);
				return;
			} else {
				//Latest change for Non Linear.. Need to test
				this.player.stop();
				//end
			    this.setLinearAdMode(ad, callback);
                //check if VPAID
                if (mediaFile.apiFramework === 'VPAID') {
                    if (!webapis.adframework.config.get("VPAID_ENABLE")) {
                        ad.setErrored();
                        this.handleVSuitePlaybackError(this.state.currentAdBreak(), ad, 902, "Ad framework was disabled to Play VPAID [Check config]", this.state.currentContentPlayhead(), null);
                        callback.call(this);
                        return;
                    }
                    /** Make sure only JS VPAID will be played */
                    else if (!mediaFile.isJavaScript()) {
                        ad.setErrored();
                        this.handleVSuitePlaybackError(this.state.currentAdBreak(), ad, 403, "Could not Play non JS VPAID", this.state.currentContentPlayhead(), null);
                        callback.call(this);
                        return;
                    }
					else {
						; /*NULL*/
					}
					
					this.onAdBreakStart(this.state.currentAdBreak());
                    //Check VPAID prebuffered?
					if(webapis.adframework.VisualOverlay.bufferingVPAIDObj && ad.uid === webapis.adframework.VisualOverlay.bufferingVPAIDObj.adID && true === webapis.adframework.VisualOverlay.bufferingVPAIDObj.isPrebuffered) {					
                        this.log("Play prebuffered VPAID: " + ad.uid);
						webapis.adframework.events.dispatch(webapis.adframework.events.START_VPAID, "");
                    } else {
                        this.log("Play unbuffered VPAID: " + ad.uid);
						this.prebufferNextVPAIDAd(ad, 'linear');	//true will invoke Start VPAID on its own in VisualOverlay.js
						webapis.adframework.events.dispatch(webapis.adframework.events.START_VPAID, "");
                    }

					this.sendAdTypeEvent();
					this.player.setTargetArea( webapis.adframework.PlayerAdapter.DisplayArea.NONE, this.state.contentDisplayArea());	//Set Default Area for VPAID Linear Video
					
                    //Dispatch LINEAR_AD_START event
                    var vpaidSkippable = null;
                    if(webapis.adframework.VisualOverlay.currentVPAIDObj && webapis.adframework.VisualOverlay.currentVPAIDObj.VPAIDWrapper) {
                       	;/*NULL*/
                    }
                    webapis.adframework.events.dispatch(webapis.adframework.events.LINEAR_AD_START, {
                        skippable: vpaidSkippable,
                        apiFramework: mediaFile.apiFramework,
                        url: mediaFile.getURL(),
                        icons: null,
						adID: ad.uid,
						isVPAID: true
                    });

                    //Callback when the VPAID is finished
                    this.listenForVPAIDDone(function() {
						self.state.currentPreloadedLinearVPAIDAd(null);
                        callback.call(self);
                    }, ad);
					
                } else {
					this.onAdBreakStart(this.state.currentAdBreak());
					this.playAd(ad);
                }
			    ad.setPlayed();
            }
		} 
		else {
			//No linear to play, all done, so callback immediately
			callback.call(this);
		}
	};
	
	Obj.prototype.resetOldBreak = function(ad, type) {
		//This block is added to turn off any currently running non linear adBreak
		if(this.state.currentNonLinearAdBreak() && this.state.currentAdBreak() !== this.state.currentNonLinearAdBreak()){
			this.log("Found existing NL Break with  id : " + this.state.currentNonLinearAdBreak().uid + " Current Break Id : " + this.state.currentAdBreak().uid + "Type of Ad :" + type);
			if(type === "nonlinear" || (this.state.getCurrentNonLinearAd() && this.state.getCurrentNonLinearAd().isShown)) {
				if(webapis.adframework.VisualOverlay.VPAIDWrapper){
					var stopPromise = new webapis.adframework.Promise();
					stopPromise.onSuccess(function() {
						if(self.state.currentNonLinearAdBreak() && self.state.currentNonLinearAdBreak().isNonLinearFound()) {
							self.state.currentNonLinearAdBreak().nonLinearFound(false);
							self.resetAdBreak(self.state.currentNonLinearAdBreak(), self.state.currentNonLinearAdBreak().triggerEventType());		//Invoke breakEnd for the break to be killed
						}
					});
					webapis.adframework.VisualOverlay.VPAIDWrapper.stopAd(stopPromise, true);	//No Need to invoke callback listenVPAID here
				}
				
				webapis.adframework.events.dispatch(webapis.adframework.events.CLOSE_NONLINEAR, "");	//close currently running non linear by calling hineNonLinearClose
				if(this.state.currentNonLinearAdBreak() && this.state.currentNonLinearAdBreak().isNonLinearFound()) {
					this.state.currentNonLinearAdBreak().nonLinearFound(false);
					this.resetAdBreak(this.state.currentNonLinearAdBreak(), this.state.currentNonLinearAdBreak().triggerEventType());		//Invoke breakEnd for the break to be killed
				}
					
				this.state.resetNonLinearAd();					//Reset status of NonLinear Ads
				if(this.state.currentPreloadedNonLinearVPAIDAd() && this.state.currentPreloadedNonLinearVPAIDAd() !== ad){
					this.state.currentPreloadedNonLinearVPAIDAd(null);
				}
			}
			else if(type === "linear" && webapis.adframework.VisualOverlay.VPAIDWrapper){
				webapis.adframework.VisualOverlay.VPAIDWrapper.stopAd(null, true);	//No Need to invoke callback listenVPAID here
			}
			else{
				;	//Do Nothing
			}
		}
		else if(type === "linear" && webapis.adframework.VisualOverlay.VPAIDWrapper){
			webapis.adframework.VisualOverlay.VPAIDWrapper.stopAd(null, true);	//No Need to invoke callback listenVPAID here
		}
		else{
			;		//Do Nothing
		}
	};
	
	/**
	* @fn		getcompanionRequirement
	* @brief	
	*
	* @param[in]/[out]	: ad
	* @return			: Obj.prototype.getcompanionRequirement =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getcompanionRequirement = function(ad) {
	
		var companionCreativeArray = ad.getCompanionCreativeArray();
		var companionRequirementFailed = false;
	
		for (var i = 0; i < companionCreativeArray.length && !companionRequirementFailed; i++) {
			var companionCreative = companionCreativeArray[i];
			var companions = companionCreative.companions;
			var companionRequiredAttr = companionCreative.getRequired();
			var hasSkipped = false;
			var hasAccepted = false;
			
			var linearArea = this.state.defaultWindow();
			var playerArea = this.state.defaultFullscreen();
			var width = linearArea.x + linearArea.w;
			var height = linearArea.y;
			
			var totalW = width;
			var totalH = height;
			
			for (var j = 0; j < companions.length; j++) {
				//Developer Defined Ads Skipping logic go here
				if( companionRequiredAttr === "all" && ((totalW + companions[j].getWidth()) > playerArea.w || (totalH + companions[j].getHeight()) > playerArea.h)){
					companions[j].setRejected();
					hasSkipped = true;
					break; //break out of loop for all case as not required to check others
				} 
				else if(companionRequiredAttr !== "all" && ((width + companions[j].getWidth()) > playerArea.w || (height + companions[j].getHeight()) > playerArea.h)){
					companions[j].setRejected();
					hasSkipped = true;
				}
				else{
					hasAccepted = true;
				}
				
				totalW += companions[j].getWidth();
				totalH += companions[j].getHeight();
			}
			
			//Making Sure all companions are showed
			if (companionRequiredAttr === "all" && hasSkipped) {
				webapis.adframework.events.dispatch(webapis.adframework.events.COMPANION_AD_FAILED_REQUIRED_ALL);
				companionRequirementFailed = true;
				ad.setErrored();
				this.handleVSuitePlaybackError(this.state.currentAdBreak(), ad, 602, "Rejected ad: Companion REQUIRED=ALL condition failed", this.state.currentContentPlayhead(), companionCreative.companions[0].getAssetURI());
				//Making Sure at least one companions is showed
			} else if (companionRequiredAttr === "any" && !hasAccepted) {
				webapis.adframework.events.dispatch(webapis.adframework.events.COMPANION_AD_FAILED_REQUIRED_ANY);
				companionRequirementFailed = true;
				ad.setErrored();
				this.handleVSuitePlaybackError(this.state.currentAdBreak(), ad, 602, "Rejected ad: Companion REQUIRED=ANY condition failed", this.state.currentContentPlayhead(), companionCreative.companions[0].getAssetURI());
			}
			else{
				this.isCompanionRendered = false;
			}
		}
		return companionRequirementFailed;
	};

	/**
	* @fn		companionDisplay
	* @brief	
	*
	* @param[in]/[out]	: ad
	* @return			: Obj.prototype.companionDisplay =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.companionDisplay = function(ad) {
	
		var companionCreativeArray = ad.getCompanionCreativeArray();
	
		for (var i = 0; i < companionCreativeArray.length; i++) {
			var companionCreative = companionCreativeArray[i];
			var companions = companionCreative.companions;
			var companionRequiredAttr = companionCreative.getRequired();
			var curCompanionAd = this.state.currentCompanionAd();
                        var companion = null;
                        var cpr = "";
			var changePlayerSize = false;

			if(companionRequiredAttr === "all") {
				for (var k = 0; k < companions.length; k++) {
					companion = companions[k];
					//The Prioritized Resource [STATIC_IMAGE > HTML > IFRAME > STATIC_JS > STATIC_FLASH]
					cpr = companion.getPriorityCompanionResource();
					//The Compiled HTML (e.g. STATIC_IMAGE will return "<img src='http://domain.com/someimage.jpg' alt='text' />")
					
					if(curCompanionAd && curCompanionAd.uid === ad.uid) {
						changePlayerSize = true;
					}
					
						var cpr_html = cpr.getCompiledHtmlElement(companion);
						webapis.adframework.events.dispatch(webapis.adframework.events.COMPANION_ADS_CREATIVE_DETECTED, {
							companionCreative: cpr_html,
							comp_uid: companion.uid,
						ad_uid: ad.uid,
						onlyPlayerSize: changePlayerSize
						});

								
					companion.setCreatedView();
					companion.handleEvent("creativeView",
						this.state.currentAdPlayhead(), this.player.getDuration(),
						this.state.currentContentPlayhead(),
						companion.getAssetURI()
					);
				}
			}
			else {
				companions.sort(this.resourceComparer);
				for (var j = 0; j < companions.length; j++) {
					companion = companions[j];
					if(!companion.isRejected()) {
							break;
						}
				}
				
				cpr = companion.getPriorityCompanionResource();
				
				//The Compiled HTML (e.g. STATIC_IMAGE will return "<img src='http://domain.com/someimage.jpg' alt='text' />")
				
				if(curCompanionAd && curCompanionAd.uid === ad.uid) {
					changePlayerSize = true;
				}
				
					var cpr_htm = cpr.getCompiledHtmlElement(companion);
						webapis.adframework.events.dispatch(webapis.adframework.events.COMPANION_ADS_CREATIVE_DETECTED, {
						companionCreative: cpr_htm,
						comp_uid: companion.uid,
					ad_uid: ad.uid,
					onlyPlayerSize: changePlayerSize
					});

								
				companion.setCreatedView();
				companion.handleEvent("creativeView",
					this.state.currentAdPlayhead(), this.player.getDuration(),
					this.state.currentContentPlayhead(),
					companion.getAssetURI()
					);
			}
		}
		if (companionCreativeArray.length > 0) {
			this.state.currentCompanionAd(ad);
			this.companion_shown = true;
			this.isCompanionRendered = true;
		}
	};
	
	/**
	* @fn		playAd
	* @brief	
	*
	* @param[in]/[out]	: ad
	* @return			: Obj.prototype.playAd =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.playAd = function(ad){

		var region = webapis.adframework.PlayerAdapter.DisplayArea.NONE;	
		var playerArea;
		var creative = ad.getLinearCreative();
		var mediaFile = creative.getOptimalMediaFile(); 
		this.state.currentVideoURL(mediaFile.getURL()); //Record current state
		//Sets a timeout for linear resource retrieval. If playback does not begin within the specified time, the linear ad will be aborted.
		//If a timeout has occurred within the last 60 seconds, the timeout value is changed to another number.
		var timeOutValue = webapis.adframework.config.get("LINEAR_RESOURCE_TIMEOUT");
		if (this.state.linearAdHasRecentlyTimedOut()) {
			timeOutValue = Math.min(webapis.adframework.config.get("LINEAR_RESOURCE_TIMEOUT"), webapis.adframework.config.get("LINEAR_RESOURCE_REPEAT_TIMEOUT"));
		}
		if (timeOutValue > 1000) {
			this.state.linearAdTimeout(setTimeout(this.linearAdTimeoutHelper, timeOutValue));
		}

		var curPrebufAd = this.state.prebufferedLinearAd();
		if( curPrebufAd && typeof curPrebufAd !== "undefined"){
			this.info("  Set prebuffered state to false before playing ad ");
			curPrebufAd.setPrebuffered("false");
			this.state.prebufferedLinearAd(null);
            this.state.prebufferedLinearAdBreak(null);
		}
               
        var bufferedUrl = this.player.getBufferedVideoURL();
		if(bufferedUrl && bufferedUrl.indexOf(mediaFile.getURL()) >= 0) {
			this.info(" Play prebuffered ad with url " + mediaFile.getFixedURL());
			this.player.playBufferedVideo();				
			if( ad.getCompanionCreativeArray().length === 0 && !this.companion_shown ) {
				region = ad.getMatchingRegion(creative.adID, "linear");
				this.state.currentAdRegion(region);
			}
			playerArea = this.state.contentDisplayArea();
			this.player.setTargetArea(region, playerArea);
			webapis.adframework.events.dispatch(webapis.adframework.events.PREBUFFER_EVENT, { message: "play: buffered advertisement"});
			if(!this.isCompanionRendered)
			{
			    this.companionDisplay(ad);
			}
			//end
		} 
        	else {
		
			this.player.cancelBufferedVideo();
		    	this.info("  Playing Unbuffered ad with url " + mediaFile.getFixedURL());
			
			var urlToBuffer = mediaFile.getURL();
			//Allow the app developer to modify the linear ad URL
			var linearAdUrlModifierFunction = this.state.setLinearAdUrlModifier();
			if (typeof linearAdUrlModifierFunction === "function") {
				var modifiedURL = linearAdUrlModifierFunction(urlToBuffer);
				if (typeof modifiedURL === "string" && modifiedURL.trim() && modifiedURL !== urlToBuffer) {
					urlToBuffer = modifiedURL;
				}
			}
			//If the MediaFile is streaming, set the StartBitrate
			if (urlToBuffer.indexOf("STARTBITRATE" < 0) && (mediaFile.getType() === webapis.adframework.LinearMediaFile.Types.HLS ||
				mediaFile.getType() === webapis.adframework.LinearMediaFile.Types.SMOOTH ||
				mediaFile.getType() === webapis.adframework.LinearMediaFile.Types.DASH)) {
				var startBitrate = webapis.adframework.config.get("START_BITRATE");

				if (typeof startBitrate === "string" && startBitrate.toLowerCase() === "auto") {
					startBitrate = this.player.Execute("GetCurrentBitrates");
					if (typeof startBitrate === "number" && startBitrate > 1000) {
						startBitrate = Math.round(startBitrate * webapis.adframework.config.get("START_BITRATE_AUTO_RATIO"));
					}
				}

				if (typeof startBitrate === "number" && startBitrate > 1000) {
					urlToBuffer += "|STARTBITRATE=" + startBitrate;
				}
			}
			urlToBuffer += mediaFile.getURLPostfix();	
            this.player.initPlayer(urlToBuffer);
			var beforeLinearAdStartFunction = this.state.beforeLinearAdStart();
			if (typeof beforeLinearAdStartFunction === "function") {
				beforeLinearAdStartFunction(this.player.getInternalPlayer());
			}
			this.player.startPlayback();			
			
			if( ad.getCompanionCreativeArray().length === 0 && !this.companion_shown ) {
				region = ad.getMatchingRegion(creative.adID, "linear");
				this.state.currentAdRegion(region);
			}
			playerArea = this.state.contentDisplayArea();
			this.player.setTargetArea(region, playerArea);
			webapis.adframework.events.dispatch(webapis.adframework.events.PREBUFFER_EVENT, { message: "play: UNBUFFERED ADVERTISEMENT | " + mediaFile.getFixedURL()});
		}
		webapis.adframework.events.dispatch(webapis.adframework.events.STREAM_TYPE, { type: webapis.adframework.utils.detectVideoType(mediaFile.getURL()) });		
	};
	
	/**
	* @fn		resourceComparer
	* @brief	
	*
	* @param[in]/[out]	: a
	*					: b
	* @return			: Obj.prototype.resourceComparer =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.resourceComparer = function(a, b) {
	var ap = webapis.adframework.CompanionResource.PriorityMap[a.getPriorityCompanionResource().getType()];
        var bp = webapis.adframework.CompanionResource.PriorityMap[b.getPriorityCompanionResource().getType()];
        if (!bp) {
            return 1;
        }
        if (!ap) {
            return -1;
        }
        return ap - bp;
    };
	
	
	//Given an ad object, tries to prebuffer its linear creative.
	/**
	* @fn		tryBufferingNextAd
	* @brief	
	*
	* @param[in]/[out]	: nextAdBreak
	*					: nextAd
	* @return			: Obj.prototype.tryBufferingNextAd =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.tryBufferingNextAd = function(nextAdBreak, nextAd) {
		if (!nextAd || nextAd.isPrebuffered() || (this.state.prebufferedLinearAd() && this.state.prebufferedLinearAd().isErrored()) || this.state.currentPreloadedNonLinearVPAIDAd() === nextAd || this.state.currentPreloadedLinearVPAIDAd() === nextAd) {
			return true;	//Do nothing
		}
	
		var linearCreative = nextAd.getLinearCreative();
		var ad = null;
		
		if (!linearCreative) {
			
			this.log(" TryBufferingNextAd: No Linear Creative Found for ad Id : " + nextAd.uid + " Break ID : " + nextAdBreak.uid);

			//If nextAd is not LinearAd, check if there is any nonLinear VPAID to preBuffer
			var nonlinearCreative = nextAd.getNonLinearCreative();
			var variation = null;
			if (nonlinearCreative) {
				variation = nonlinearCreative.getBestVariation();
			}
			if (variation && variation.apiFramework === 'VPAID') {
				//this.prebufferNextVPAIDAd(nextAd, 'nonlinear');	//Temporary comment
			}
			
			ad = nextAdBreak.getNextLinearAd();
			if(ad){
				this.tryBufferingLinearAd(nextAdBreak, nextAd);
			}
			else{
				return false;
			}
		}
		else{
			this.tryBufferingLinearAd(nextAdBreak, nextAd);
		}
		
		return true;
	};
	
	//Given an ad object, tries to prebuffer its linear creative.
	/**
	* @fn		tryBufferingLinearAd
	* @brief	
	*
	* @param[in]/[out]	: nextAdBreak
	*					: nextAd
	* @return			: Obj.prototype.tryBufferingNextAd =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.tryBufferingLinearAd = function(nextAdBreak, nextAd) {
	
		this.log(" TryBufferingLinearAd for ad Id : " + nextAd.uid + " Break ID : " + nextAdBreak.uid);
		var linearCreative = nextAd.getLinearCreative();
		var mediaFile = linearCreative.getOptimalMediaFile();
		if (!mediaFile) {
            this.handleVSuitePlaybackError(adBreak, nextAd, 403, "Could not find a valid MediaFile", state.currentContentPlayhead(), null);
			nextAd.setErrored();
			return false;
		}

		var curPrebufAd = this.state.prebufferedLinearAd();
		if( curPrebufAd && curPrebufAd !== nextAd ){
			curPrebufAd.setPrebuffered("false");
		}

		if (mediaFile.apiFramework === 'VPAID') {
			if (!mediaFile.isJavaScript()) {
				nextAd.setErrored();
				this.handleVSuitePlaybackError(adBreak, nextAd, 403, "Could not Play non JS VPAID", state.currentContentPlayhead(), null);
				return false;
			} else if (!webapis.adframework.config.get("VPAID_ENABLE")) {
				nextAd.setErrored();
				this.handleVSuitePlaybackError(adBreak, nextAd, 902, "Ad framework was disabled to Play VPAID [Check config]", state.currentContentPlayhead(), null);
				return false;
			} else {
				try {
					nextAd.setPrebuffered();
					this.state.prebufferedLinearAd(nextAd);
					this.state.prebufferedLinearAdBreak(nextAdBreak);
					this.prebufferNextVPAIDAd(nextAd, 'linear');
				} catch (e) {
					;/*NULL*/
				}
			}
		}
		else{
			nextAd.setPrebuffered();
			this.state.prebufferedLinearAd(nextAd);
			this.state.prebufferedLinearAdBreak(nextAdBreak);
			var urlToBuffer = mediaFile.getURL();
			if(this.player.getBufferedVideoURL() && (this.player.getBufferedVideoURL().indexOf(urlToBuffer) >= 0)) { 
				this.info("  Ad with url " + urlToBuffer +"already being pre buffered "); 
				return false; 
			}
		
			//Allow the app developer to modify the linear ad URL
			var linearAdUrlModifierFunction = this.state.setLinearAdUrlModifier();
			if (typeof linearAdUrlModifierFunction === "function") {
				var modifiedURL = linearAdUrlModifierFunction(urlToBuffer);
				if (typeof modifiedURL === "string" && modifiedURL.trim() && modifiedURL !== urlToBuffer) {
					urlToBuffer = modifiedURL;
				}
			}
			//If the MediaFile is streaming, set the StartBitrate
			if (urlToBuffer.indexOf("STARTBITRATE" < 0) && (mediaFile.getType() === webapis.adframework.LinearMediaFile.Types.HLS ||
				mediaFile.getType() === webapis.adframework.LinearMediaFile.Types.SMOOTH ||
				mediaFile.getType() === webapis.adframework.LinearMediaFile.Types.DASH)) {
				var startBitrate = webapis.adframework.config.get("START_BITRATE");
				if (typeof startBitrate === "string" && startBitrate.toLowerCase() === "auto") {
					startBitrate = this.player.Execute("GetCurrentBitrates");
					if (typeof startBitrate === "number" && startBitrate > 1000) {
						startBitrate = Math.round(startBitrate * webapis.adframework.config.get("START_BITRATE_AUTO_RATIO"));
					}
				}
				if (typeof startBitrate === "number" && startBitrate > 1000) {
					urlToBuffer += "|STARTBITRATE=" + startBitrate;
				}
			}
			urlToBuffer += mediaFile.getURLPostfix();
			if (this.player.getBufferedVideoURL() === urlToBuffer) {
				return false;
			}
		
			//Execute beforeLinearAdStart() and start prebuffering
			var beforeLinearAdStartFunction = this.state.beforeLinearAdStart();
			this.player.startBufferingVideo(urlToBuffer, 0, beforeLinearAdStartFunction);
		}
		webapis.adframework.events.dispatch(webapis.adframework.events.PREBUFFER_EVENT, { message: "prebuffer: ADVERTISEMENT | " + mediaFile.getURL()});
	};
	
	//Usually called at the beginning of playback or after an adBreak ends. It resumes the content at its previously recorded playhead.
	/**
	* @fn		playOrResumeContent
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.playOrResumeContent =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.playOrResumeContent = function() {
		//Stop if we're already playing content or have ended playback
		//If non linear was found, in that case current url will be same Main Content URL
		if (!this.state.currentContentVideoURL() || (this.state.currentVideoURL() && this.state.currentContentVideoURL() === this.state.currentVideoURL())) {
			return;
		}
	
		//Latest change for Non Linear.. Need to test
		this.player.stop();
		//end
		
		this.state.currentVideoURL(this.state.currentContentVideoURL());
		var vodUrl = this.state.currentContentVideoURL();
		if(this.player.getBufferedVideoURL() && (this.player.getBufferedVideoURL().indexOf(vodUrl) >= 0)){
			webapis.adframework.events.dispatch(webapis.adframework.events.PREBUFFER_EVENT, { message: "play: buffered content: " + this.player.getBufferedVideoURL() });
			this.player.playBufferedVideo();
		}
		else {
			var currentPlayTime = this.state.getCurrentContentPlayTime();
			webapis.adframework.events.dispatch(webapis.adframework.events.PREBUFFER_EVENT, { message: "play: NOT buffered content: "+ vodUrl });
			
            this.player.initPlayer(vodUrl);
            var beforeContentStartFunction = this.state.beforeContentStart();
            if (typeof beforeContentStartFunction === "function") {
                beforeContentStartFunction(this.player.getInternalPlayer());
            }
            if (currentPlayTime && currentPlayTime > 0) {
                this.player.startPlayback(currentPlayTime);
            } else {
                this.player.startPlayback();
            }			
		}
		var displayArea = this.state.contentDisplayArea();
		if(displayArea){
			this.player.setTargetArea(null, displayArea);
		}
	};
	
	/**
	* @fn		tryBufferingContent
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.tryBufferingContent =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.tryBufferingContent = function() {
		var vodUrl = this.state.currentContentVideoURL();
		
		//To avoid prebuffering if main content is already in prebuffering mode OR
		//current url is already set as main content which usually happens when main content is in pause state
		//In case of currentVideoURL is null, prebuffering of scheduled ad/content required.
		if(!vodUrl || (this.player.getBufferedVideoURL() && (this.player.getBufferedVideoURL().indexOf(vodUrl) >= 0)) || 
			(this.state.currentVideoURL() && (this.state.currentVideoURL().indexOf(vodUrl) >= 0))) { 
			return false;
		}
		else {
			this.state.prebufferedLinearAd(null);
			this.state.prebufferedLinearAdBreak(null);

			var beforeContentStartFunction = this.state.beforeContentStart();
			var currentPlayTime = this.state.getCurrentContentPlayTime();
			
			 //If the content URL does not specify a STARTBITRATE, modify the URL to be the previously recorded content bitrate
			var startBitrate = this.state.contentBitrate();
			if(!startBitrate) {
				//If no previous bitrate was recorded, try to get it from the current ad
				startBitrate = this.player.Execute("GetCurrentBitrates");
			}
			var lowerCaseContent = vodUrl.toLowerCase();
            
			//If content is of a streaming protocol and we have recorded a preferred bitrate, prebuffer the content using the saved bitrate
			if(webapis.adframework.config.get("ADAPTIVE_CONTENT") === true
				&& this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.LINEAR_AD 
				&& typeof(startBitrate) === "number" && startBitrate > 1000 
				&& lowerCaseContent.indexOf("startbitrate") < 0
				&& (lowerCaseContent.indexOf("component=hls") > 0 || lowerCaseContent.indexOf("component=smooth") > 0 || lowerCaseContent.indexOf("component=dash") > 0)) {
				startBitrate = Math.round(startBitrate * webapis.adframework.config.get("START_BITRATE_AUTO_RATIO"));
				if (typeof startBitrate === "number" && startBitrate > 1000) {
					vodUrl += "|STARTBITRATE=" + startBitrate;
				}
			}
	
			if(currentPlayTime > 0) {
				this.player.startBufferingVideo(vodUrl, currentPlayTime, beforeContentStartFunction);
			}
			else {
				this.player.startBufferingVideo(vodUrl, 0, beforeContentStartFunction);
			}
		}

		webapis.adframework.events.dispatch(webapis.adframework.events.PREBUFFER_EVENT, { message: "prebuffer: CONTENT | " + vodUrl});
	
		//No Idea why this is happening in buffering VOD????
		//PreLoad the scheduled nonLinearAD
	};
	
	//If we are waiting more than LINEAR_RESOURCE_TIMEOUT for the linear ad, we need to error out and move on.
	/**
	* @fn		linearAdTimeoutHelper
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.linearAdTimeoutHelper =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.linearAdTimeoutHelper = function() {
		if (self.state.linearAdTimeout()) {
			clearTimeout(self.state.linearAdTimeout());
		}
		self.state.linearAdTimeout(null);
		if (!self.state.currentLinearAd()) {
			self.error("Linear Ad timeout called, but there is no ad playing");
			return false;
		}
		self.error("Linear Ad Timeout!!");

		//Fake a CONNECTION_FAILED event to force the ad framework to move on
		self.state.linearAdHasRecentlyTimedOut(true);
		self.internalOnActivePlayerProblem(webapis.adframework.PlayerAdapter.events.CONNECTION_FAILED);
	};
	
	//Called at the beginning of ad playback - sets some internal state, and most importantly, keeps track of what to do when the ad is finished (the callback).
	/**
	* @fn		setLinearAdMode
	* @brief	
	*
	* @param[in]/[out]	: ad
	*					: callback
	* @return			: Obj.prototype.setLinearAdMode =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setLinearAdMode = function(ad, callback) {
		this.state.switchToLinearAdMode(ad, ad.getLinearCreative()); //Milliseconds we are into the current video (ad or content)
		if(ad.getLinearCreative().getOptimalMediaFile()) {		
			this.state.currentVideoURL(ad.getLinearCreative().getOptimalMediaFile().getFixedURL());
		}
		this.currentAdCallback = callback;
	};
	
	//Handles current playback time updates for ads. This is a complex function, as it has to handle prebuffering, fire events, and check a lot of other stuff.
	/**
	* @fn		onAdCurrentPlayTime
	* @brief	
	*
	* @param[in]/[out]	: playtime
	* @return			: Obj.prototype.onAdCurrentPlayTime =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onAdCurrentPlayTime = function(playtime) {
	
		webapis.adframework.events.dispatch(webapis.adframework.events.PLAYBACK_TIME, { ms: playtime });
		this.state.currentAdPlayhead(playtime);
		var params = {};
		params.ms = playtime;
		
		var adDuration = this.getDuration();
		
		if(this.state.currentLinearCreative() && this.state.currentLinearCreative().isSkippable()) {
			params.secondsUntilSkippable = Math.ceil((this.state.currentLinearCreative().getSkipMS(playtime, adDuration) - this.state.currentAdPlayhead())/1000);
		}
		
		if(!(webapis.adframework.VisualOverlay.currentVPAIDObj && webapis.adframework.VisualOverlay.currentVPAIDObj.VPAIDWrapper)) {
			webapis.adframework.events.dispatch(webapis.adframework.events.AD_PLAYBACK_TIME, params);
			this.onLinearAdProgress(this.state.currentAdPlayhead(), adDuration);
		}
		//Prebuffer next ad/main content
		if(adDuration > 0 && (adDuration - playtime) < webapis.adframework.config.get("AD_PREBUFFER_ADVANCE_TIME")) {
			var nextAd = this.state.currentAdBreak().getNextAd();
			var status = false;
			var temp_adBreak = null;
			
			if(nextAd && !this.tryBufferingNextAd(this.state.currentAdBreak(), nextAd)) {	//Ad does not have linear creative
				temp_adBreak = this.scheduler.getNextAd();
				if(temp_adBreak && temp_adBreak.getNextLinearAd()){
					status = this.tryBufferingNextAd(temp_adBreak, temp_adBreak.getNextLinearAd());
				}
			}
			else if(!nextAd){
				temp_adBreak = this.scheduler.getNextAd();
				if(temp_adBreak && temp_adBreak.getNextAd()){
					status = this.tryBufferingNextAd(temp_adBreak, temp_adBreak.getNextAd());
				}
			}
			else{
				return; //Do nothing.. Found linear ad to prebuffer
			}
			
			if(status === false){	//Found no linear Ad to prebuffer
				this.tryBufferingContent();
			}
		}
	};
	
	//Sets some internal state variables conducive to playing content.
	/**
	* @fn		setContentMode
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.setContentMode =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setContentMode = function() {
		webapis.adframework.events.dispatch(webapis.adframework.events.PLAYBACK_TYPE, { type: "content" });
		this.state.switchToContentMode();
		this.currentAdCallback = null;
	};


    Obj.prototype.prebufferingForVPAID = function() {
        var nextAd = this.state.currentAdBreak() ? this.state.currentAdBreak().getNextAd() : null;
        if (nextAd) {
            this.tryBufferingNextAd(this.state.currentAdBreak(), nextAd);
        } 
		else{
            this.tryBufferingContent();
        }
    };

    Obj.prototype.prebufferNextVPAIDAd = function(nextAd, type) {
        this.log("prebufferNextVPAIDAd with ad id : " + nextAd.uid);
		
		if(type === 'linear'){
			this.state.currentPreloadedLinearVPAIDAd(nextAd);
		}
		else if(type === 'nonlinear'){
			this.state.currentPreloadedNonLinearVPAIDAd(nextAd);
			this.listenForVPAIDDone(function() {
				if (self.state.hasHaltedForVPAID()) {
					self.state.hasHaltedForVPAID(false);
					self.playMainContent();
				}
				self.handleNonLinearClose(nextAd.uid);
			}, nextAd);
		}
		else{
			;
		}
		
		this.initializeVPAID(nextAd, type);
	};

	/**
	* @fn				: playNonLinearAd
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.playNonLinearAd =
	* @warning			: None
	* @exception		: None
	* @see
	*/	
	//Displays the queued NonLinearCreative
	Obj.prototype.playNonLinearAd = function() {
		var nonLinearAdParam = this.state.getCurrentNonLinearAd();
		if(nonLinearAdParam === null){
			return;
		}
		var nonLinearAd = nonLinearAdParam.ad;
		var nonLinearAdID = nonLinearAd.uid;
		var parentAdBreakID = this.state.currentNonLinearAdBreak().uid;
		var variation = nonLinearAd.getNonLinearCreative().getBestVariation();
		var resource = variation.getBestResource();

	
		this.onAdBreakStart(this.state.currentNonLinearAdBreak());
		nonLinearAdParam.isShown = true;
		if(this.state.currentPlaybackType() === webapis.adframework.MediaState.PlaybackType.CONTENT){
			this.state.currentAdType(webapis.adframework.MediaState.AdType.NONE);
		}

		if (nonLinearAdParam.isVPAID === true ) {
            if (!webapis.adframework.VisualOverlay.bufferingVPAIDObj || typeof webapis.adframework.VisualOverlay.bufferingVPAIDObj.isPrebuffered === "undefined" 
				|| !webapis.adframework.VisualOverlay.bufferingVPAIDObj.isPrebuffered || nonLinearAdID !== webapis.adframework.VisualOverlay.bufferingVPAIDObj.adID) 
			{
				this.prebufferNextVPAIDAd(nonLinearAd, 'nonlinear');
			}
			webapis.adframework.events.dispatch(webapis.adframework.events.START_VPAID, "");
			this.state.currentPreloadedNonLinearVPAIDAd(null);
		}else {
			webapis.adframework.events.dispatch(webapis.adframework.events.NONLINEAR_DETECTED, {
				adID: nonLinearAdID,
				adbreakID: parentAdBreakID,
				resourceType: resource.getType(),
				resourceURL: resource.getResource(),
				displayTime: variation.calculateDisplayTime(),
				width: variation.getWidth(),
				height: variation.getHeight(),
                                scalable: variation.isScalable() 
			});
			
			if(nonLinearAd.companionFound() === true){
				this.companionDisplay(nonLinearAd);
				nonLinearAd.companionFound(false);
			}
        }
	};

	Obj.prototype.initializeVPAID = function(ad, type){
		
		var creative, url, adParameters;
		var displayTime = 0;
		
		if(type === "linear"){
			creative = ad.getLinearCreative();
			url = creative.getOptimalMediaFile().getURL();;
			adParameters = creative.adParameters;
		}
		else if(type === "nonlinear"){
			creative = ad.getNonLinearCreative();
			var variation = creative.getBestVariation();
			url = variation.getBestResource().getResource();
			displayTime = variation.calculateDisplayTime();
			adParameters = variation.adParameters;
		}
		else{
			; /*NULL*/
		}

		webapis.adframework.events.dispatch(webapis.adframework.events.INITIALIZE_VPAID, {
			type: type,
			ad: ad,
			url: url,
			displayTime: displayTime,
			adParameters: adParameters
		});
	};

	//Handles the playback time updates during content playback. This function is complex because it has to do prebuffering and triggering of midrolls.
	/**
	* @fn		onContentCurrentPlayTime
	* @brief	
	*
	* @param[in]/[out]	: playtime
	* @return			: Obj.prototype.onContentCurrentPlayTime =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onContentCurrentPlayTime = function(playtime) {
		webapis.adframework.events.dispatch(webapis.adframework.events.PLAYBACK_TIME, { ms: playtime });
		webapis.adframework.events.dispatch(webapis.adframework.events.CONTENT_PLAYBACK_TIME, { ms: playtime });
		//Check midrolls and play/prebuffer them if necessary, giving a callback function instruction to resume this VOD upon completion

		this.state.currentContentPlayhead(playtime);
		this.internalOnStreamReady();
		this.state.resetRetryPlayback();
		this.state.contentBitrate(this.player.contentBitrate());
		this.state.contentWidth(self.player.contentWidth());
		this.state.contentHeight(self.player.contentHeight());
		
		var nonLinearAdParam = this.state.getCurrentNonLinearAd();
		var nonLinearCreative = null;
		if (nonLinearAdParam && nonLinearAdParam.isShown === false && nonLinearAdParam.ad) {
			nonLinearCreative = nonLinearAdParam.ad.getNonLinearCreative();
		}
		
		try {
			var midroll = this.scheduler.getNextUnplayedTrigger();
		}
		catch(e) {
			this.log(e);
		}
		 //Disable Ad Insertion logic
		if (midroll && webapis.adframework.config.get("DISABLE_AD_INSERTION") === true) {
			webapis.adframework.events.dispatch("DEBUG_MESSAGE", {
					message: "Skipping ad break: Ad insertion has been disabled"
				});
			this.scheduler.checkRepeatingAdBreak(midroll);
			midroll.setSkipped();
			midroll = null;
		}
		if(midroll && this.foundBreak === false) {
		    var repeat = this.ifPostponeRepeatBreak(midroll);
			if(!repeat)
			{
				this.foundBreak = true;
				this.state.currentAdType(webapis.adframework.MediaState.AdType.MIDROLL);
				
				
				this.playAdBreak(midroll, this.playMainContent);
				this.scheduler.checkRepeatingAdBreak(midroll);


                webapis.adframework.events.dispatch(webapis.adframework.events.ADBREAK_START, {
                    triggerTime: playtime,
                    extensions: midroll._extensions.local,
                    globalExtensions: midroll._extensions.global
                });				
				
			}
		}
		else if (this.foundBreak === false){
            var contentDuration = this.player.getDuration();
			var playhead = playtime + webapis.adframework.config.get("CONTENT_PREBUFFER_ADVANCE_TIME") + 1000;  
			midroll = this.scheduler.getMidrollForBuffering(playhead);
			if( midroll )
			{
			    var repeatition = this.ifPostponeRepeatBreak(midroll);
				if(!repeatition && (!this.tryBufferingNextAd(midroll, midroll.getNextAd()) && nonLinearCreative)) {
						this.playNonLinearAd();
					}
					else {
						;/*NULL*/
					}		
			}
			else{
			
				if (nonLinearCreative) {
					this.playNonLinearAd();
				}
				if(contentDuration > 0 && ( (contentDuration - playtime) < (webapis.adframework.config.get("CONTENT_PREBUFFER_ADVANCE_TIME") + 1000))){
					//No more midrolls will play during the course of the content - let's buffer a postroll
					var postroll = this.scheduler.getNextEventAdBreak(webapis.adframework.MediaState.PostrollEvents, this.scheduler.postrollEventsList);
					if(postroll) {
						this.tryBufferingNextAd(postroll, postroll.getNextAd());
					}
				}
			}
		}
		else{
			;/*NULL*/			
		}
	};

	/**
	* @fn				: checkRepeatingAdBreak
	* @brief	
	*
	* @param[in]/[out]	: oldBreak
	* @return			: Obj.prototype.checkRepeatingAdBreak =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	//To discard repeat breaks in case of conflict with other pre scheduled ad break.
	Obj.prototype.ifPostponeRepeatBreak = function(breakChosen) {
				
		var status = false;
		if(this.breakDur > 0 && this.breakDur <= this.state.currentContentPlayhead()) {
			this.breakDur = 0;
		}
		else if(this.breakDur > 0 && !breakChosen.isPlayed() && breakChosen.isRepeating() && breakChosen._repeatCount > 0)
		{
			var param = {
				playhead: this.breakDur,
				duration: this.state.contentDuration()
			};
			
			if(this.scheduler.test(breakChosen, param)) {
				status = true;
				breakChosen.setPlayed();
				this.scheduler.checkRepeatingAdBreak(breakChosen);
			}
		}
		else {
			; /*NULL*/
		}
		return status;
		
	
	};
	

	/**
	* @fn		listenForCompanionAdsCreative
	* @brief	
	*
	* @param[in]/[out]	: callback
	* @return			: Obj.prototype.listenForCompanionAdsCreative =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.listenForCompanionAdsCreative = function(callback) {
		webapis.adframework.events.addListener(webapis.adframework.events.COMPANION_ADS_CREATIVE_DETECTED, function(evt, params) {
			callback(event, params);
		});
	};

	/**
	* @fn		handleCompanionAdViewElementClick
	* @brief	
	*
	* @param[in]/[out]	: uid
	* @return			: Obj.prototype.handleCompanionAdViewElementClick =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleCompanionAdViewElementClick = function(uid) {

		var ad = self.state.currentCompanionAd();
		if(ad == null){
			return;
			}
		var companionCreativeArray = ad.getCompanionCreativeArray();
		var PriorityCompanionResource = null;
		
		for (var i = 0; i < companionCreativeArray.length ; i++) {
		    var check = false;
			var companionCreative = companionCreativeArray[i];
			var companions = companionCreative.companions;
			for (var k = 0; k < companions.length; k++) {
				var companion = companions[k];
				if (companion.uid === uid ) {
						PriorityCompanionResource = companion.getPriorityCompanionResource();
						check = true;
						break;
				}
			}
			if(check === true)
			{
				break;
			}
		}
		

		if( PriorityCompanionResource !== null ){
			var clickThrough = PriorityCompanionResource.clickThrough;
			var clickTrackers = PriorityCompanionResource.clickTrackers;
			var resourceType = PriorityCompanionResource.getType();
			
			//Handle Click for Static Resource
			if (clickThrough && ( resourceType === 'STATIC_IMAGE' || resourceType === 'STATIC_FLASH')) {
				//OPEN IFRAME
				webapis.adframework.VisualOverlay.openIFrame(clickThrough);
				//Handle Click for HTML Resource
			} else if (resourceType === 'HTML') {
				//Extracting url from Atag
				var regex_a_tag = /href=['"]([^'">]+)/i;
				clickThrough = regex_a_tag.exec(PriorityCompanionResource.content);
				if (clickThrough) {
					//OPEN IFRAME
					webapis.adframework.VisualOverlay.openIFrame(clickThrough[1]);
				}
			}
			else {
			; /*NULL*/
		}
			if (clickTrackers) {
				//SEND TRACKING
				PriorityCompanionResource.handleClick();
			}
		}
	};

	//Immediately disable ad insertion, cutting off any ads in progress
	/**
	* @fn		disableAdInsertion
	* @brief	
	*
	* @param[in]/[out]	: allowCurrentAdbreakToFinish
	* @return			: Obj.prototype.disableAdInsertion =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.disableAdInsertion = function(allowCurrentAdbreakToFinish) {

		self.log("Disabling ad insertion...");

		webapis.adframework.config.set("DISABLE_AD_INSERTION", true);

		//Cancel any linear ads playing
		if (allowCurrentAdbreakToFinish !== true && self.state.isLinearAdMode()) {
			self.log("Stopping current ad and resuming content: " + self.state.currentContentVideoURL());
			self.player.stop();
			self.setContentMode();
			if (self.state.currentContentVideoURL()) {
				self.playOrResumeContent();
			}
		}

		self.log("Disabled ad insertion...");
	};

	/**
	* @fn		enableAdInsertion
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.enableAdInsertion =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.enableAdInsertion = function() {
		self.log("Enabling ad insertion...");
		webapis.adframework.config.set("DISABLE_AD_INSERTION", false);
	};
	 //Adds a function to execute each time before a linear ad starts. The function is passed a reference to the player object that will play content.
	Obj.prototype.setLinearAdUrlModifier = function(func) {
		self.state.setLinearAdUrlModifier(func);
	};
	Obj.prototype.changeContentUrl = function(newURL) {
		self.state.currentContentVideoURL(newURL);
	};
	
	//Send VSuite Errors to the ad server
	/**
	* @fn		handleVSuitePlaybackError
	* @brief	
	*
	* @param[in]/[out]	: adBreak
	*					: ad
	*					: code
	*					: message
	*					: contentPlayhead
	*					: adAssetURI
	* @return			: Obj.prototype.handleVSuitePlaybackError =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleVSuitePlaybackError = function(adBreak, ad, code, message, contentPlayhead, adAssetURI) {
		try {
			var eMessage = message ? message : webapis.adframework.Errors[code];
			if (adBreak) {
				adBreak.handleError(code, eMessage, contentPlayhead, adAssetURI);
			} else {
				self.error("handleVSuitePlaybackError called with null adBreak");
			}
			if (ad) {
				ad.handleError(code, eMessage, contentPlayhead, adAssetURI);
			} else {
				self.error("handleVSuitePlaybackError called with null ad");
			}

			webapis.adframework.events.dispatch("VSUITE_PLAYBACK_ERROR", {
				message: eMessage,
				code: code
			});
		} catch (e) {
			self.error("Failed to dispatch error: " + e);
		}
	};
	
	
	Obj.prototype.setApplicationError = function(type, adBreakID, adID, code, message, adAssetURI) {
		self.error(" HandleApplicationError with BreakID : " + adBreakID + "ad ID : " + adID);
		var contentPlayhead = this.state.currentContentPlayhead();
		var adBreak = null;
		var ad = null;
		
		switch(type){
		
			case webapis.adframework.MediaState.PlaybackType.NONLINEAR_AD:
				if( adBreakID === this.state.currentNonLinearAdBreak().uid ){
					adBreak = this.state.currentNonLinearAdBreak();
				}
				else{
					return;
				}
				
				var nonLinearParam = this.state.getCurrentNonLinearAd();
				if( nonLinearParam && adID === nonLinearParam.ad.uid ){
					ad = nonLinearParam.ad;
					nonLinearParam.isErrored = true;
				}
				else{
					return;
				}
				break;
				
			default:
				return;
			
		}
	
		this.handleVSuitePlaybackError(adBreak, ad, code, message, contentPlayhead, adAssetURI);
		this.handleNonLinearClose(ad.uid);
	};

	//Event handlers for VMAP Events
	
	/**
	* @fn				: onAdBreakStart
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onAdBreakStart =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onAdBreakStart = function(adBreak) {
        adBreak.handleBreakStart();
    };
	
	/**
	* @fn				: onAdBreakEnd
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onAdBreakEnd =
	* @warning			: None
	* @exception		: None
	* @see
	*/
    Obj.prototype.onAdBreakEnd = function(adBreak) {
        adBreak.handleBreakEnd();
    };
	
	//Event handlers for VAST Events
	
	/**
	* @fn		onLinearAdProgress
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onLinearAdProgress =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onLinearAdProgress = function(adPlayhead, adDuration) {
		//Cancel any ad timeout checking
		if (this.state.linearAdTimeout()) {
			clearTimeout(this.state.linearAdTimeout());
		}
		this.state.linearAdTimeout(null);
		this.state.currentLinearAd().handleImpression(this.state.currentContentPlayhead(), this.state.currentVideoURL());
		this.state.currentLinearCreative().handleProgress("progress", adPlayhead, adDuration, this.state.currentContentPlayhead(), this.state.currentVideoURL());
	};
	
	/**
	* @fn		onLinearAdComplete
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onLinearAdComplete =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onLinearAdComplete = function() {
		if(this.state.currentLinearCreative()){
			this.state.currentLinearCreative().handleEvent("complete", this.state.currentAdPlayhead(), this.player.getDuration(), this.state.currentContentPlayhead(), this.state.currentVideoURL());
		}
	};
	/**
	* @fn		onLinearAdSkip
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onLinearAdSkip =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onLinearAdSkip = function() {
		//Cancel any ad timeout checking
		if (this.state.linearAdTimeout()) {
			clearTimeout(this.state.linearAdTimeout());
		}
		this.state.linearAdTimeout(null);
		this.state.currentLinearCreative().handleEvent("skip", this.state.currentAdPlayhead(), this.player.getDuration(), this.state.currentContentPlayhead(), this.state.currentVideoURL());
	};
	/**
	* @fn		onLinearAdMute
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onLinearAdMute =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onLinearAdMute = function() {
		this.state.currentLinearCreative().handleEvent("mute", this.state.currentAdPlayhead(), this.player.getDuration(), this.state.currentContentPlayhead(), this.state.currentVideoURL());
	};
	/**
	* @fn		onLinearAdUnmute
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onLinearAdUnmute =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onLinearAdUnmute = function() {
		this.state.currentLinearCreative().handleEvent("unmute", this.state.currentAdPlayhead(), this.player.getDuration(), this.state.currentContentPlayhead(), this.state.currentVideoURL());
	};
	/**
	* @fn		onLinearAdPause
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onLinearAdPause =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onLinearAdPause = function() {
		this.state.currentLinearCreative().handleEvent("pause", this.state.currentAdPlayhead(), this.player.getDuration(), this.state.currentContentPlayhead(), this.state.currentVideoURL());
	};
	/**
	* @fn		onLinearAdRewind
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onLinearAdRewind =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onLinearAdRewind = function() {
		this.state.currentLinearCreative().handleEvent("rewind", this.state.currentAdPlayhead(), this.player.getDuration(), this.state.currentContentPlayhead(), this.state.currentVideoURL());
	};
	/**
	* @fn		onLinearAdResume
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onLinearAdResume =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onLinearAdResume = function() {
		this.state.currentLinearCreative().handleEvent("resume", this.state.currentAdPlayhead(),this. player.getDuration(), this.state.currentContentPlayhead(), this.state.currentVideoURL());
	};
	/**
	* @fn		onLinearAdExpand
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onLinearAdExpand =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onLinearAdExpand = function() {
		this.state.currentLinearCreative().handleEvent("expand", this.state.currentAdPlayhead(), this.player.getDuration(), this.state.currentContentPlayhead(), this.state.currentVideoURL());
	};
	/**
	* @fn		onLinearAdCollapse
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onLinearAdCollapse =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onLinearAdCollapse = function() {
		this.state.currentLinearCreative().handleEvent("collapse", this.state.currentAdPlayhead(), this.player.getDuration(), this.state.currentContentPlayhead(), this.state.currentVideoURL());
	};

	/**
	* @fn		onLinearAdFullscreen
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onLinearAdFullscreen =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onLinearAdFullscreen = function() {
		this.state.currentLinearCreative().handleEvent("fullscreen",this. state.currentAdPlayhead(), this.player.getDuration(), this.state.currentContentPlayhead(), this.state.currentVideoURL());
	};
	/**
	* @fn		onLinearAdExitFullscreen
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onLinearAdExitFullscreen =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onLinearAdExitFullscreen = function() {
		this.state.currentLinearCreative().handleEvent("exitFullscreen", this.state.currentAdPlayhead(), this.player.getDuration(), this.state.currentContentPlayhead(), this.state.currentVideoURL());
	};
	/**
	* @fn		onLinearAdAcceptInvitation
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onLinearAdAcceptInvitation =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onLinearAdAcceptInvitation = function() {
		this.state.currentLinearCreative().handleEvent("acceptInvitationLinear", this.state.currentAdPlayhead(), this.player.getDuration(), this.state.currentContentPlayhead(), this.state.currentVideoURL());
	};
	
	/**
	* @fn		onCompanionAdProgress
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.onCompanionAdProgress =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.onCompanionAdProgress = function() {
		state.currentLinearCreative().handleEvent("progress", this.state.currentAdPlayhead(), this.player.getDuration(), this.state.currentContentPlayhead(), this.state.currentVideoURL());
	};

	//Returns the SAMSUNG-INFOLINK-PLAYER object (for fine player control)
	/**
	* @fn		getPlayer
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getPlayer =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getPlayer = function() {
		return this.player;
	};
	
	/**
	* @fn		getState
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getState =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getState = function() {
		return this.state;
	};
	
	/**
	* @fn		getDuration
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getDuration =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getDuration = function() {
	
	    if (webapis.adframework.VisualOverlay.VPAIDWrapper && true === webapis.adframework.VisualOverlay.VPAIDWrapper.getAdLinear()) {
            return webapis.adframework.VisualOverlay.VPAIDWrapper.VPAIDDuration ? Math.round(webapis.adframework.VisualOverlay.VPAIDWrapper.VPAIDDuration * 1000) : webapis.adframework.VisualOverlay.VPAIDWrapper.VPAIDDuration;
        }
		return this.player.getDuration();
	};
	
	Obj.prototype.getContentPlayheadPosition = function() {
        	return this.state.currentContentPlayhead();
	};
	
	Obj.prototype.getAdBreakTimes = function() {
		var duration = this.getDuration();
		if (this.getCurrentPlaybackType() === webapis.adframework.PlaybackState.MediaState.CONTENT && typeof(duration) === "number" && duration > 1) {
			var breakTimes = this.scheduler.getAdBreakTimes(duration);
			return breakTimes;
		}
		return null;
	};
	
	/**
	* @fn		appConfig
	* @brief	
	*
	* @param[in]/[out]	: param
	* @return			: Obj.prototype.appConfig =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.appConfig = function(config){
		if(this.state){
		
			var tempParam = {
				x : config.fullscreenX,
				y : config.fullscreenY,
				w : config.fullscreenW,
				h : config.fullscreenH
			};
			
			this.state.defaultFullscreen(tempParam);
			
			tempParam = {
				x : config.windowX,
				y : config.windowY,
				w : config.windowW,
				h : config.windowH
			};
			
			this.state.defaultWindow(tempParam);
			this.setDisplayArea(config.fullscreenX, config.fullscreenY, config.fullscreenW, config.fullscreenH, true);
		}
	};
	
	/**
	* @fn		Execute
	* @brief	
	*
	* @param[in]/[out]	: arg1
	*					: arg2
	*					: arg3
	*					: arg4
	* @return			: Obj.prototype.Execute =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.Execute = function(arg1, arg2, arg3, arg4) {
		return this.player.Execute(arguments);
	};
	
	//Just some error/logging functions
	/**
	* @fn		log
	* @brief	
	*
	* @param[in]/[out]	: str
	* @return			: Obj.prototype.log =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.log = function(str) {
		str = "[adframework PLAYER] " + str;
		console.log(str, 1);
	};
	/**
	* @fn		error
	* @brief	
	*
	* @param[in]/[out]	: str
	* @return			: Obj.prototype.error =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.error = function(str) {
		this.log("[ERROR] " + str);
	};

	/**
	* @fn		info
	* @brief	
	*
	* @param[in]/[out]	: str
	* @return			: Obj.prototype.info =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.info = function(str) { 
		this.log("[INFO] " + str); 
	};

/*********************************************NON Linear ******************************************/	
    Obj.prototype.listenForVPAIDDone = function(callback, ad) {
        this.log("listenForVPAIDDone executed on: " + ad.uid);
        var completeFunc = function(evt, params) {
            if (params.ad && ad === params.ad) {
                self.log("ContentManager: VPAID_COMPLETE: " + ad.uid);
                webapis.adframework.events.removeListener(webapis.adframework.events.VPAID_COMPLETE, completeFunc);
				params.clearPromise.reportSuccess();
				if(typeof params.noCallback === "undefined" || params.noCallback === false){
					callback.call(self);
				}
            } else {
                self.log("WRONG ONE!!! : " + ad.uid);
            }
        };

        var errorFunc = function(evt, params) {
            if (params.ad && ad === params.ad) {
                self.log("ContentManager: VPAID_ERROR");
                var errorMessage = "VPAID ERROR";
                webapis.adframework.events.removeListener(webapis.adframework.events.VPAID_ERROR, errorFunc);
				
                if (params.errorMessage) {
                    errorMessage = params.errorMessage;
                }
				
				params.clearPromise.reportSuccess();

				
				if(webapis.adframework.VisualOverlay.VPAIDWrapper){
					var stopPromise = new webapis.adframework.Promise();
					stopPromise.onSuccess(function() {
						callback.call(self);					
					});
					webapis.adframework.VisualOverlay.VPAIDWrapper.stopAd(stopPromise, true);	//No Need to invoke callback listenVPAID here
				}
				else{
					callback.call(self);
				}
            } else {
                self.log("WRONG ONE(e): " + ad.uid);
            }
		};

        webapis.adframework.events.addListener(webapis.adframework.events.VPAID_COMPLETE, completeFunc, false);
        webapis.adframework.events.addListener(webapis.adframework.events.VPAID_ERROR, errorFunc, false);
	};

	Obj.prototype.handleNonLinearTracking = function(nonLinearAdID, event) {
	
		var nonLinearParam = this.state.getCurrentNonLinearAd();
		var nonLinearAd = null;
		var nonLinearCreative = null;
		
		if( !nonLinearParam || !nonLinearParam.ad || nonLinearAdID !== nonLinearParam.ad.uid )
		{
			return; //TO DO
		}
		else{
			nonLinearAd = nonLinearParam.ad;
			nonLinearCreative = nonLinearAd.getNonLinearCreative();
		}
		
		
		var variation = nonLinearCreative.getBestVariation();
		var resourceURI = null;
		if (variation.getBestResource().getType() !== webapis.adframework.NonLinearResource.ResourceType.HTML) {
			resourceURI = variation.getBestResource().getResource();
		}
		
		switch(event)
		{
			case "impression":
				nonLinearAd.handleImpression(this.state.currentContentPlayhead(), resourceURI);
				break;
			
			case "creativeView":
				nonLinearCreative.handleEvent("creativeView", null, null, this.state.currentContentPlayhead(), resourceURI);
				break;
				
			default:
				nonLinearCreative.handleEvent(event, this.state.currentAdPlayhead(), this.player.getDuration(), this.state.currentContentPlayhead(), resourceURI);
				break;
		}
	};
	
	//If any linear/nonlinear creative is clicked, fire the acceptInvitation and clickTracking events, and open the iFrame to the clickThrough URL.
	Obj.prototype.handleAdClick = function(adID, type) {
	
		var currentAd = null;
		var creative = null;
		var variation = null;
		var resourceURI = null;
		var event = "";
		var nonLinearParam = null;

		
		switch( type ) {
		
			case webapis.adframework.MediaState.PlaybackType.LINEAR_AD:
				currentAd = this.state.currentLinearAd();
				if( !currentAd || adID !== currentAd.uid )
				{
					return; //TO DO
				}
				creative = currentAd.getLinearCreative();
				variation = creative;
				resourceURI = this.state.currentVideoURL();
				event = "acceptInvitationLinear";
				break;
				
			case webapis.adframework.MediaState.PlaybackType.NONLINEAR_AD:
			
				nonLinearParam = this.state.getCurrentNonLinearAd();
				if( !nonLinearParam || !nonLinearParam.ad || adID !== nonLinearParam.ad.uid )
				{
					return; //TO DO
				}
				currentAd = nonLinearParam.ad;
				creative = currentAd.getNonLinearCreative();
				variation = creative.getBestVariation();
				if (variation.getBestResource().getType() !== webapis.adframework.NonLinearResource.ResourceType.HTML) {
					resourceURI = variation.getBestResource().getResource();
				}
				event = "acceptInvitation";
				break;
				
			default:
				break;
		
		}
		
		creative.handleEvent(event, this.state.currentAdPlayhead(), this.player.getDuration(), this.state.currentContentPlayhead(), resourceURI);

		if (variation) {
			variation.handleClick();
			if (variation.getClickThrough()) {
				webapis.adframework.VisualOverlay.openIFrame(variation.getClickThrough());
			}
		}
		else {
			return;
		}
	};
	
	Obj.prototype.handleNonLinearClose = function(nonLinearAdID){
		//by jasmine.d for non linear
		var nonLinearBreak = self.state.currentNonLinearAdBreak();
		var nonLinearAdParam = self.state.getCurrentNonLinearAd();
	
		if( (nonLinearAdParam && nonLinearBreak && nonLinearAdParam.ad)  && (nonLinearAdParam.ad.uid === nonLinearAdID && (nonLinearAdParam.errored || nonLinearAdParam.isShown)) ) {	//Not to delete ad if not shown yet or there is no error
				var adsLeft = self.state.currentNonLinearAd(null); //Dequeue the NonLinear
				if(adsLeft === 0){
					this.state.currentNonLinearAdBreak().nonLinearFound(false);
					self.resetAdBreak(self.state.currentNonLinearAdBreak(), self.state.currentNonLinearAdBreak().triggerEventType());
					self.state.resetNonLinearAd();
				}
				else{
					;
				}
			}
		
	};
	
	
	Obj.prototype.handleVPAIDEvent = function(param) {

		var ad, creative, url;
		var contentPlayhead = this.state.currentContentPlayhead();
		
		if(param.type === "linear"){
			ad = param.ad;
			creative = ad.getLinearCreative();
			url = creative.getOptimalMediaFile().getURL();
		}
		else if(param.type === "nonlinear"){
			ad = param.ad;
			creative = ad.getNonLinearCreative();
			var variation = creative.getBestVariation();

			if (variation.getBestResource().getType() !== webapis.adframework.NonLinearResource.ResourceType.HTML) {
				url = variation.getBestResource().getResource();
			}
		}
		else{
		; /*NULL*/
		}

		switch(param.event)
		{
			case "impression":
				ad.handleVPAIDImpression(contentPlayhead, url);
				break;
			
			case "ClickTracking":
				if (typeof creative.creative === 'function') {
					creative.handleClick();
				}
				break;
				
			case "creativeView" :
				creative.handleVPAIDEvent(param.event, param.adPlayhead, param.adDuration, contentPlayhead, url);
				webapis.adframework.events.dispatch(webapis.adframework.events.VPAID_EVENT, "creativeView");
				break;
			
			case "start" : 
				creative.handleVPAIDEvent(param.event, param.adPlayhead, param.adDuration, contentPlayhead, url);
				webapis.adframework.events.dispatch(webapis.adframework.events.VPAID_EVENT, "start");
				break;
				
			default:
				creative.handleVPAIDEvent(param.event, param.adPlayhead, param.adDuration, contentPlayhead, url);
				if(param.type === "nonlinear" && param.event === "close" && param.linear === true){
					this.handleNonLinearClose(ad.uid);
				}
				break;
		}
	};
	
	
/*********************************************NON Linear ******************************************/	
	return Obj;
})();

if(typeof Object.freeze === "function") { 
	Object.freeze(webapis.adframework.ContentManager);
}

if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}

/**
 * @brief Scheduler Model.
 * @details A BluePrint of Scheduler Model
 * @return Null
 */
webapis.adframework.Scheduler = (function() {
	
	"use strict";

	
	var Obj = function(state) {
		this.mediaState = state; //The scheduler needs a reference to the media state when scheduling ads.
		this.initializeState();
	};
	
	Obj.Property = {
		Position: 				"Position",
		Duration: 				"Duration",
		WatchedTime:			"WatchedTime",
		TotalWatchedTime:		"TotalWatchedTime",
		FullScreen: 			"FullScreen",
		IsPlaying: 				"IsPlaying",
		IsPaused: 				"IsPaused",
		IsStopped:				"IsStopped",
		HasVideo:				"HasVideo",
		HasAudio: 				"HasAudio",
		HasCaptions: 			"HasCaptions",
		PlayerWidth: 			"PlayerWidth",
		PlayerHeight:  			"PlayerHeight",
		ContentWidth : 			"ContentWidth",
		ContentHeight: 			"ContentHeight",
		ContentBitrate: 		"ContentBitrate",
		ContentUrl: 			"ContentUrl"
	};
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj.Property);
	}
	
	//Resets the Schedule's state
	/**
	* @fn		initializeState
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.initializeState =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initializeState = function() {
        this.adbreakList = []; //List of AdBreaks
	    this.eventbased_ads = {}; // amit tyagi
		this.prerollEventsList = [];
		this.postrollEventsList = [];
		this.currentAdXMLRetrievalPromise = null;
	};

	//For event based trigger
	/**
	* @fn		getNextEventTrigger
	* @brief	
	*
	* @param[in]/[out]	: event
	* @return			: Obj.prototype.getNextEventTrigger =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getNextEventTrigger = function(event) { 
	
		var currBreak;
		if( event && typeof event !== "undefined" && event !== webapis.adframework.ContentManager.MEvents.NONE){
			currBreak = null;
		}
		else {
			event = this.mediaState.currentEvent();
			currBreak = this.mediaState.currentAdBreak();
		}
		var adList = this.eventbased_ads[event];
		
		var param = {
			playhead: this.mediaState.currentContentPlayhead(),
			duration: this.mediaState.contentDuration(),
			adList: adList,
			event: event,
			currBreak: currBreak
		};
			
		var adBreak =  this.getNextUnplayedAdBreak(param); 
		if( adBreak ){
			this.mediaState.currentAdList(adList);
			this.mediaState.currentEvent(event);
		}
		return adBreak;
	};

	//Gets the next unplayed ad break( property based ).
	/**
	* @fn		getNextUnplayedTrigger
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getNextUnplayedTrigger =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getNextUnplayedTrigger = function() { 
	
		var event = this.mediaState.currentEvent(); 
		var adList = null;
		if( event && event !== webapis.adframework.ContentManager.MEvents.NONE ){
			adList = this.eventbased_ads[event];
		}
		else{
			adList = this.adbreakList;
		}
		
		var param = {
			playhead: this.mediaState.currentContentPlayhead(),
			duration: this.mediaState.contentDuration(),
			adList: adList,
			event: event,
			currBreak: this.mediaState.currentAdBreak()
		};
			
		var adBreak =  this.getNextUnplayedAdBreak(param); 
		if( adBreak ){
			this.mediaState.currentAdList(adList);
		}
		return adBreak;
	};
	
	//To get next adBreak to be prebuffered during the playback of linear video ad
	/**
	* @fn		getAdBreakForBuffering
	* @brief	
	*
	* @param[in]/[out]	: adList
	*					: event
	* @return			: Obj.prototype.getAdBreakForBuffering =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getAdBreakForBuffering = function(adList, event) { 
	
		var param = {
			playhead: this.mediaState.currentContentPlayhead(),
			duration: this.mediaState.contentDuration(),
			adList: adList,
			event: event,
			currBreak: this.mediaState.currentAdBreak()
		};
			
		var adBreak =  this.getNextUnplayedAdBreak(param); 
		return adBreak;
	};
	
	/**
	* @fn		getMidrollForBuffering
	* @brief	
	*
	* @param[in]/[out]	: playhead
	* @return			: Obj.prototype.getMidrollForBuffering =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getMidrollForBuffering = function(playhead) { 
	
		//To find midroll for prebufferring
		var param = {
			playhead: playhead,
			duration: this.mediaState.contentDuration(),
			adList: this.adbreakList,
			event: null,
			currBreak: null
		};
			
		var adBreak =  this.getNextUnplayedAdBreak(param); 
		return adBreak;
	};
	
	//Is an ad XML retrieval in progress?
	/**
	* @fn		isReady
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isReady =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isReady = function() {
		if(this.currentAdXMLRetrievalPromise) { 
			return false; 
		}
		else { 
			return true; 
		}
	};
	
	//When the schedule has finished retrieving XML, then perform action
	/**
	* @fn		whenReady
	* @brief	
	*
	* @param[in]/[out]	: action
	* @return			: Obj.prototype.whenReady =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.whenReady = function(action) {
		if(this.currentAdXMLRetrievalPromise) {
			this.currentAdXMLRetrievalPromise.onComplete(action);
		}
		else {
			action();
		}
	};
	
	/**
	* @fn		insertAdBreak
	* @brief	
	*
	* @param[in]/[out]	: url
	*					: params
	* @return			: Obj.prototype.insertAdBreak =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.insertAdBreak = function(url, params) {
		var self = this;
		
		if(params && params.time) {
			; /*NULL*/
		}
		else {
			; /*NULL*/
		}

		var promise = new webapis.adframework.Promise();
		
		promise.onSuccess(function(adThing) {
			self.insertAdObject(adThing, params);
		}).onFailure(function(result) {
			webapis.adframework.events.dispatch(webapis.adframework.events.ADBREAK_INSERTION_FAILURE, {
				message: "Failed to insert ads: " + result
			});
		}).onComplete(function() {
			self.currentAdXMLRetrievalPromise = null;
		});
		this.currentAdXMLRetrievalPromise = promise;
		
		webapis.adframework.Parser.parse(url, promise);
	};
	
	/**
	* @fn		insertAdObject
	* @brief	
	*
	* @param[in]/[out]	: adThing
	*					: params
	* @return			: Obj.prototype.insertAdObject =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.insertAdObject = function(adThing, params) {
		if(!adThing || !adThing.length) {
			return false;
		}
		
		if(adThing[0] instanceof webapis.adframework.Ad) {
			//We just parsed a VAST
			
			var offset; 
			if(params && params.time) {
				offset = params.time;
			}
			else {
				var playhead = this.playbackState.currentContentPlayhead();
				if(!playhead) { 
					playhead = 1; 
				}
				offset = playhead;
			}
			var newAdbreak = new webapis.adframework.BreakInfo({
				offset: offset,
				breakType: "linear",
				eventTrackers: [],
				errorTrackers: [],
				ads: adThing
			});
			this.scheduleAdBreak(newAdbreak);
		}
		else if(adThing[0] instanceof webapis.adframework.BreakInfo) {
			
			//We just parsed a VMAP
			if(params && params.time) {
				//We are overriding the adBreak's default time
				for(var i = 0; i < adThing.length; i++) {
					if(params.time === "now") {
						params.time = this.mediaState.currentContentPlayhead();
					}
					
					adThing[i].setOffset(params.time);
					this.scheduleAdBreak(adThing[i]);
					webapis.adframework.events.dispatch(webapis.adframework.events.ADBREAK_INSERTION_SUCCESS, {
							message: "AdBreak containing " + adThing[i].getAds().length + " ads was inserted at : " + adThing[i].getOffset().toString()
					});
				}
			}
			else {
				for(var j = 0; j < adThing.length; j++) {
					this.scheduleAdBreak(adThing[j]);
						webapis.adframework.events.dispatch(webapis.adframework.events.ADBREAK_INSERTION_SUCCESS, {
							message: "AdBreak containing " + adThing[j].getAds().length + " ads was inserted at : " + adThing[j].getOffset().toString()
						});

				}
			}	
		}
		else {
			this.error("We have no idea what we just parsed..." + adThing[i].getOffset().toString());
			return false;
		}
		return true;
	};

	//*******************************************************************************************************
	//ADBREAK LOGIC
	//*******************************************************************************************************
	/**
	* @fn		isValidBreak
	* @brief	
	*
	* @param[in]/[out]	: adBreakObj
	*					: param
	* @return			: Obj.prototype.isValidBreak =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isValidBreak = function(adBreakObj, param)
	{
		if(adBreakObj.getOffset().getType() === webapis.adframework.Offset.OffsetType.CONDITIONAL_OFFSET){
		
			var isValid = this.test(adBreakObj, param);
			return isValid;
		}
		else if(adBreakObj.test(param.playhead, param.duration)) {
				return true;
		}
		else{
				return false;
		}
	};
	Obj.prototype.getAdBreakTimes = function(contentDuration) {
		var list = [];
		contentDuration = 0;
		return list;
	};	
	/**
	* @fn		getNextUnplayedAdBreak
	* @brief	
	*
	* @param[in]/[out]	: param
	* @return			: Obj.prototype.getNextUnplayedAdBreak =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getNextUnplayedAdBreak = function(param) {
		var adBreakToBePlayedFirst = null;
		var rollArray = param.adList;
		var adBreak = null;

		if(rollArray) {

			var index = 0;
			var currentBreak = param.currBreak;
			if( currentBreak && rollArray === this.mediaState.currentAdList()) {
				for(var i = 0; i < rollArray.length; i++) {
					adBreak = rollArray[i];
					if( currentBreak === adBreak ){
						index = i + 1;
						break;
					}
				}
				
				for( ; index < rollArray.length; index++){
					adBreak = rollArray[index];	
					if(currentBreak !== adBreak && !adBreak.isPlayed() && !adBreak.isSkipped() && this.isValidBreak(adBreak, param)) {
						adBreakToBePlayedFirst = adBreak;
						break;
					}
				}
			}
			else{
				for( ; index < rollArray.length; index++){
					adBreak = rollArray[index];	
					if(!adBreak.isPlayed() && !adBreak.isSkipped() && this.isValidBreak(adBreak, param)) {
						adBreakToBePlayedFirst = adBreak;
						break;
					}
				}
			}
		}
		
		if(adBreakToBePlayedFirst) {
			return adBreakToBePlayedFirst;
		}
		else {
			return false;
		}
	};

	/**
	* @fn		getNextAd
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getNextAd =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getNextAd = function(){

		var temp_adBreak = null;

		var adList = this.mediaState.currentAdList();
		var adType = this.mediaState.currentAdType();
	
		if( adType !== webapis.adframework.MediaState.AdType.MIDROLL || adType !== webapis.adframework.MediaState.AdType.NONE){
			temp_adBreak = this.getAdBreakForBuffering(adList, this.mediaState.currentEvent());
			if(!temp_adBreak){
				switch( adType ){
					case webapis.adframework.MediaState.AdType.PREROLL:
						temp_adBreak = this.getNextEventAdBreak(webapis.adframework.MediaState.PrerollEvents, this.prerollEventsList );
						break;

					case webapis.adframework.MediaState.AdType.POSTROLL:
						temp_adBreak = this.getNextEventAdBreak(webapis.adframework.MediaState.PostrollEvents, this.postrollEventsList );
						break;
					
					default:
						break;
				}
			}
		}
		
		return temp_adBreak;
	};
	
	//This function is for searching any preroll/postroll ad for any other preroll/postroll event
	/**
	* @fn		getNextEventAdBreak
	* @brief	
	*
	* @param[in]/[out]	: events
	*					: eventList
	* @return			: Obj.prototype.getNextEventAdBreak =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getNextEventAdBreak = function(events, eventList){

		var temp_adBreak = null;
		for( var key in events ){
			if( !this.isEventPlayed(key, eventList)){
				temp_adBreak = this.getAdBreakForBuffering(this.eventbased_ads[key], key);
				if(temp_adBreak){
					return temp_adBreak;
				}
			}
		}
		temp_adBreak = this.getAdBreakForBuffering(this.adbreakList);
		return temp_adBreak;
	};
	
	/**
	* @fn		getNextEvent
	* @brief	
	*
	* @param[in]/[out]	: adType
	* @return			: Obj.prototype.getNextEvent =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getNextEvent = function(adType){
		var event = null;
	
		switch(adType){
			case webapis.adframework.MediaState.AdType.PREROLL:
				for( var prerollKey in webapis.adframework.MediaState.PrerollEvents ){
					if( !this.isEventPlayed(prerollKey, this.prerollEventsList) && this.eventbased_ads[prerollKey]){
						event = prerollKey;
						return event;
					}
				}
				break;
			
			case webapis.adframework.MediaState.AdType.POSTROLL:
				for( var postrollKey in webapis.adframework.MediaState.PostrollEvents ){
					if(!this.isEventPlayed(postrollKey, this.postrollEventsList ) && this.eventbased_ads[postrollKey]){
						event = postrollKey;
						return event;
					}
				}
				break;
				
			default:
				break;
		}
		
		return event;
	
	};
	
	/**
	* @fn		setPrerollEventPlayed
	* @brief	
	*
	* @param[in]/[out]	: key
	* @return			: Obj.prototype.setPrerollEventPlayed =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setPrerollEventPlayed = function(key){
		this.prerollEventsList[key] = !this.prerollEventsList[key];
	};
	
	/**
	* @fn		setPostrollEventPlayed
	* @brief	
	*
	* @param[in]/[out]	: key
	* @return			: Obj.prototype.setPostrollEventPlayed =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setPostrollEventPlayed = function(key){
		this.postrollEventsList[key] = !this.postrollEventsList[key];
	};
	
	/**
	* @fn		isEventPlayed
	* @brief	
	*
	* @param[in]/[out]	: key
	*					: eventList
	* @return			: Obj.prototype.isEventPlayed =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isEventPlayed = function(key, eventList){
		var playStatus = eventList[key];
		if(typeof playStatus !== "undefined"){
			return  playStatus;	//1 means played, 0 means unplayed
		}
		else{
			return 1;	//Here 1 means not to be test for this event as it does not exist	
		}
	};
	
//Depending on whether an adBreak is scheduled for the start, end, or middle of the VOD, parse and categorize it accordingly
	/**
	* @fn		scheduleAdBreak
	* @brief	
	*
	* @param[in]/[out]	: adBreak
	* @return			: Obj.prototype.scheduleAdBreak =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.scheduleAdBreak = function(adBreak) {
		if(adBreak.getOffset().getType() === webapis.adframework.Offset.OffsetType.CONDITIONAL_OFFSET){// by amit tyagi
			this.scheduleConditionalBreaks(adBreak);
		}
		else {
			error("Scheduled adBreak does not have a valid offset: " + adBreak.getOffset());
		}
	};

	/**
	* @fn		scheduleConditionalBreaks
	* @brief	
	*
	* @param[in]/[out]	: adBreak
	* @return			: Obj.prototype.scheduleConditionalBreaks =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.scheduleConditionalBreaks = function(adBreak){
		var startCondition = adBreak.getOffset().getStartCondition();
		var playOn = webapis.adframework.core.getPlayer().isPlaying();
		var contentTime = this.mediaState.currentContentPlayhead();
		
		for ( var i=0; i < startCondition.length ; i++)
		{
			var name = startCondition[i].getName();
			var type = startCondition[i].getType();

			if( type === webapis.adframework.Condition.ConditionType.EVENT){
				if(name === webapis.adframework.ContentManager.MEvents.OnPlayerSizeChanged) {
					name = webapis.adframework.ContentManager.MEvents.OnFullScreenChange;
					startCondition[i].name = name;
				}
				if (!this.eventbased_ads.hasOwnProperty(name)) {
					this.eventbased_ads[name] = [];
				}
				
			switch(name)
			{
				case webapis.adframework.ContentManager.MEvents.OnItemStart:
				case webapis.adframework.ContentManager.MEvents.OnPlay:
						if(playOn || contentTime > 0) {
							adBreak.setPlayed();
						}
						else{
					this.prerollEventsList[name] = 0;
						}
					break;
						
				case webapis.adframework.ContentManager.MEvents.OnItemEnd:
					this.postrollEventsList[name] = 0;
					break;

				case webapis.adframework.ContentManager.MEvents.OnEnd:
					this.postrollEventsList[name] = 0;
					break;
						
				default:
					break;
			}			
			
				this.eventbased_ads[name].push(adBreak);
			}
			else if( type === webapis.adframework.Condition.ConditionType.PROPERTY){
				if((name === Obj.Property.Position && startCondition[i].getChildCond().length === 0 && (playOn || contentTime > 0)) && (startCondition[i].getValue(this.mediaState.contentDuration) === 0)){
						if(adBreak.isRepeating()){
							this.checkRepeatingAdBreak(adBreak);
						}
						adBreak.setPlayed();
					}
				this.adbreakList.push(adBreak);
			}
			else {
			; /*NULL*/
			}
		}
	};
	
	/**
	* @fn		test
	* @brief	
	*
	* @param[in]/[out]	: adBreakObj
	*					: param
	* @return			: Obj.prototype.test =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.test = function(adBreakObj, param){
	
		var startcondition = adBreakObj.getOffset().getStartCondition();
		var event_type = param.event;
		var playhead = param.playhead;
		var duration = param.duration;
		
		for ( var i = 0 ; i < startcondition.length; i++)
		{	
			if(event_type && event_type !== webapis.adframework.ContentManager.MEvents.NONE)
			{
				var eventName = startcondition[i].getName();
				if(eventName === event_type)
				{
					var Children = startcondition[i].getChildCond();
					for ( var j = 0 ; j < Children.length; j++)
					{
						var cond_child = Children[j];
						if(!this.evaluate(cond_child, playhead, duration))
						{
							break;
						}
					}	
					if( j === Children.length)
					{
						return true;
					}	
				}
			}
			else 
			{
				if(this.evaluate(startcondition[i], playhead, duration))
				{
					return true;
				}
			}
		}
		
		return false;
	};
	
	/**
	* @fn		testReinvoke
	* @brief	
	*
	* @param[in]/[out]	: adBreakObj
	*					: param
	* @return			: Obj.prototype.testReinvoke =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.testReinvoke = function(adBreakObj, param){
	
		var endcondition = adBreakObj.getOffset().getEndCondition();
		var event_type = param.event;
		var playhead = param.playhead;
		var duration = param.duration;
		
		for ( var i = 0 ; i < endcondition.length; i++)
		{	
			if(event_type && event_type !== webapis.adframework.ContentManager.MEvents.NONE)
			{
				var eventName = endcondition[i].getName();
				if(eventName === event_type)
				{
					var Children = endcondition[i].getChildCond();
					for ( var j = 0 ; j < Children.length; j++)
					{
						var cond_child = Children[j];
						if(!this.evaluate(cond_child, playhead, duration))
						{
							break;
						}
					}	
					if( j === Children.length)
					{
						return true;	
					}
				}
			}
			else 
			{
				if(this.evaluate(endcondition[i], playhead, duration))
				{
					return true;
				}
			}
		}
		
		return false;
	};
	
	/**
	* @fn		evaluate
	* @brief	
	*
	* @param[in]/[out]	: condition
	*					: playhead
	*					: duration
	* @return			: Obj.prototype.evaluate =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.evaluate = function(condition, playhead, duration) {
		
		var key 	= condition.getName();
		var val 	= this.getPlayerValue(key, playhead, duration);
		
		if(val != null && condition.compareValue(val, duration))	{
			var Children = condition.getChildCond();
			if(Children)
			{
				for (var a = 0, al = Children.length; a < al; ++a) 
				{
					var cond = Children[a];
					if(cond && !this.evaluate(cond, playhead, duration))
					{
						return false;
					}
				}
			}
			return true;
		}
		return false;
	};
	
	
	/**
	* @fn		getPlayerValue
	* @brief	
	*
	* @param[in]/[out]	: property
	*					: playhead
	*					: duration
	* @return			: Obj.prototype.getPlayerValue =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getPlayerValue = function(property, playhead, duration ){
	
		var val = null;
		var displayArea = null;
			switch(property){
				case Obj.Property.Position:
					if(playhead){
						val = playhead;
					}
					else{
						val = this.mediaState.currentContentPlayhead();
					}
					break;
				
				case Obj.Property.Duration:
					if(duration){
						val = duration;
					}
					else{
						val = this.mediaState.contentDuration();
					}
				break;
					case Obj.Property.WatchedTime:
						val = this.mediaState.currentContentPlayhead() - this.mediaState.startPlaybackTime();
						break;
				
				case Obj.Property.TotalWatchedTime:
					val = this.mediaState.currentContentPlayhead() - (this.mediaState.startPlaybackTime() + this.mediaState.accumulatedSeekTime());
					break;
				
				case Obj.Property.FullScreen:
					if(this.mediaState.isFullscreen()){
						val = true;
					}
					else {
						val = false;
					}
					break;
				
				case Obj.Property.IsPlaying:
					if(this.mediaState.contentState() === webapis.adframework.PlayerAdapter.State.PLAYING){
						val = true;
					}
					else {
						val = false;
					}
					break;
				
				case Obj.Property.IsPaused:
					if(this.mediaState.contentState() === webapis.adframework.PlayerAdapter.State.PAUSED){
						val = true;
					}
					else {
						val = false;
					}
					break;	
				
				case Obj.Property.IsStopped:
					if(this.mediaState.contentState() === webapis.adframework.PlayerAdapter.State.STOPPED){
						val = true;
					}
					else {
						val = false;
					}
					break;	
				
				case Obj.Property.HasVideo:
					if(this.mediaState.hasContentVideo() === true){
						val = true;
					}
					else {
						val = false;
					}
					break;	
				
				case Obj.Property.HasAudio:
					if(this.mediaState.hasContentAudio() === true){
						val = true;
					}
					else {
						val = false;
					}
					break;
				
				case Obj.Property.HasCaptions:
					if(this.mediaState.hasContentCaption() === true){
						val = true;
					}
					else {
						val = false;
					}
					break;
				
				case Obj.Property.PlayerWidth:
					displayArea = this.mediaState.contentDisplayArea();
					val = displayArea.w;
					break;
				
				case Obj.Property.PlayerHeight:
					displayArea = this.mediaState.contentDisplayArea();
					val = displayArea.h;
					break;
				
				case Obj.Property.ContentWidth:
					val = this.mediaState.contentWidth();
					break;
				
				case Obj.Property.ContentHeight:
					val = this.mediaState.contentHeight();
					break;
				
				case Obj.Property.ContentBitrate:
					val = this.mediaState.contentBitrate();
					break;
				
				case Obj.Property.ContentUrl:
					val = this.mediaState.currentContentVideoURL();
					break;
				
				default: 
					break;
				
			}
		return val;
	};
	
    //Checks if an adbreak is repeating. If it is, it will schedule the repeating adbreak based on the trigger time.
    Obj.prototype.checkRepeatingAdBreak = function(oldBreak) {
		var self = this;
        if(oldBreak.isRepeating()) {
			//Assuming its only for VMAP
		    var currentMS = oldBreak.getOffset().getStartCondition()[0].getValue(this.mediaState.contentDuration());
            var repeatPromise = oldBreak.createRepeatingAdBreakPromise(currentMS, this.mediaState.contentDuration());
            if(repeatPromise) {
                repeatPromise.onSuccess(function(newAdBreak) {
                    self.scheduleAdBreak(newAdBreak);
                    if(oldBreak) {
                        oldBreak.deleteRepeatData();   
                    }
                });
            }
        }

    };
	
	return Obj;
}());

/**
* @file		: MediaState
* @brief	: 
*			
* @author	: Amit tyagi
* @date		: 2014/8/5
*
* Copyright 2014 by Samsung Electronics Inc.
*
* This software is the confidential and proprietary information
* of Samsung Electronics Inc. (Confidential Information).  You
* shall not disclose such Confidential Information and shall use
* it only in accordance with the terms of the license agreement
* you entered into with Samsung.
*
*/

if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}
/**
 * @brief MediaState Model.
 * @details A BluePrint of MediaState Model
 * @return Null
 */
webapis.adframework.MediaState = (function() {
	
	"use strict";
	var Obj = function() {
		this.initializeState();
	};
	
	
	Obj.PlaybackType = {
		STOPPED: "STOPPED",
		CONTENT: "CONTENT",
		LINEAR_AD: "LINEAR_AD",
		NONLINEAR_AD: "NONLINEAR_AD",
		INTERACTIVE_AD: "INTERACTIVE_AD"
	};
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj.PlaybackType);
	}
	
	Obj.AdType = {

		PREROLL: "PREROLL",
		MIDROLL: "MIDROLL",
		POSTROLL: "POSTROLL",
		EVENT: 	   "EVENT",
		NONE:		"NONE"
	};
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj.AdType);
	}
	
	Obj.PrerollEvents = {
		OnPlay: 		"OnPlay",
		OnItemStart: 	"OnItemStart"
	};
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj.PrerollEvents);
	}
	
	Obj.PostrollEvents = {
		OnEnd: 		"OnEnd",
		OnItemEnd: 	"OnItemEnd"
	};
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj.PostrollEvents);
	}
	
	//Resets the Schedule's state
	/**
	* @fn		initializeState
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.initializeState =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initializeState = function() {
		
		this._currentPlayhead = 0;
		this._currentVideoURL = null;
		this._currentPlaybackType = Obj.PlaybackType.STOPPED;
		this._isMuted = false;
		
		this._isFullscreen = true;
		this._hasHaltedForVPAID = false;


		if(this._linearAdTimeout) {
			clearTimeout(this._linearAdTimeout);
		}
		this._linearAdTimeout = null;
		
		this._linearAdHasRecentlyTimedOut = false;
		if(this._linearAdTimeoutTimer) {
			clearTimeout(this._linearAdTimeoutTimer);
		}
		this._linearAdTimeoutTimer = null;
		
		this._retryCount = 0;

		this._beforeContentStartFunction = null;
		this._beforeLinearAdStartFunction = null;
		this._afterContentStartFunction = null;
		this._afterLinearAdStartFunction = null;
		
		this.initializeAdParam();
		this.initializeContentParam();
	};
	
	/**
	* @fn		initializeAdParam
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.initializeAdParam =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initializeAdParam = function(){
		this._currentAdPlayhead = 0;
		this._currentBreakDuration = 0;
		this._currentAdBreak = null;
		this._currentLinearAd = null;
		this._currentLinearCreative = null;
		this._currentCompanionAd = null;
		this._currentAdCallback = null;
		this._currentAdList = null; //added by jasmine.d
		this._currentEvent = webapis.adframework.ContentManager.MEvents.NONE;
		this._currentAdType = Obj.AdType.NONE;
		this._currentAdRegion = webapis.adframework.PlayerAdapter.DisplayArea.NONE;
		this._prebufferedLinearAd = null;
		this._prebufferedLinearAdBreak = null;
		this._currentNonLinearAdBreak = null;
		this._currentNonLinearAd = [];	
		this._isLinearAdMode = false;
		this._currentPreloadedNonLinearVPAIDAd = null;
		this._currentPreloadedLinearVPAIDAd = null;
	};
		
	/**
	* @fn		initializeContentParam
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.initializeContentParam =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initializeContentParam = function() {
		this._currentContentPlayhead = 0;
		this._currentContentVideoURL = null;
		this._contentSeekTime = 0;
		this._accumulatedSeekTime = 0; // Milliseconds of forward or backward seek time
		this._startPlaybackTime = 0; // Milliseconds of forward or backward seek time
		this._contentDuration = 0;
		this._hasContentVideo = false;
		this._hasContentAudio = false;
		this._hasContentCaption = false;
		this._contentState = webapis.adframework.PlayerAdapter.State.STOPPED;
		this._contentWidth = 0;
		this._contentHeight = 0;
		this._contentBitrate = 0;
	};
	
	/**
	* @fn		canRetryPlayback
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.canRetryPlayback =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.canRetryPlayback = function() {
		if(this._retryCount >= webapis.adframework.config.get("PLAYBACK_FAILURE_RETRY_COUNT")) {
			return false;
		}
		else {
			this._retryCount++;
			return true;
		}
	};
	
	/**
	* @fn		resetRetryPlayback
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.resetRetryPlayback =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.resetRetryPlayback = function() {
		this._retryCount = 0;
	};
	
	/**
	* @fn		linearAdHasRecentlyTimedOut
	* @brief	
	*
	* @param[in]/[out]	: truth
	* @return			: Obj.prototype.linearAdHasRecentlyTimedOut =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.linearAdHasRecentlyTimedOut = function(truth) {
		if(!this._linearAdTimeoutHelper) {
			var linearAdTimeoutHelper = function() {
				this._linearAdHasRecentlyTimedOut = false;
				if(this._linearAdTimeoutTimer) {
					clearTimeout(this._linearAdTimeoutTimer);
				}
				this._linearAdTimeoutTimer = null;
			};
			this._linearAdTimeoutHelper = linearAdTimeoutHelper.bind(this);
		}
		
		if(truth === true) {
			this._linearAdTimeoutHelper();
			this._linearAdHasRecentlyTimedOut = true;
			this._linearAdTimeoutTimer = setTimeout(this._linearAdTimeoutHelper, 60000);
		}
		else if(truth === false) {
			this._linearAdTimeoutHelper();
		}
		else {
			return this._linearAdHasRecentlyTimedOut;
		}
	};


	/**
	* @fn		switchToContentMode
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.switchToContentMode =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.switchToContentMode = function() {
		this._isLinearAdMode = false;
		this.hasHaltedForVPAID(false);
		this.currentPlayhead(null); //Milliseconds we are into the current video (ad or content)
		this.currentAdPlayhead(null); //Milliseconds we are into the current ad
		this.currentLinearAd(null);
		this.prebufferedLinearAd(null);
		this.prebufferedLinearAdBreak(null);
		this.currentLinearCreative(null);
		this.currentAdBreak(null);
		this.currentPlaybackType(Obj.PlaybackType.CONTENT);
		this.currentAdType(Obj.AdType.NONE);	//jasmine.d
		if(this.linearAdTimeout()) {
			clearTimeout(this.linearAdTimeout());
		}
		this._currentBreakDuration = 0;
		this.linearAdTimeout(null);
	};
	
	/**
	* @fn		switchToLinearAdMode
	* @brief	
	*
	* @param[in]/[out]	: ad
	* @return			: Obj.prototype.switchToLinearAdMode =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.switchToLinearAdMode = function(ad, creative) {
		this._isLinearAdMode = true;
		this.currentPlayhead(null); //Milliseconds we are into the current video (ad or content)
		this.currentLinearAd(ad);
		this.currentLinearCreative(creative);
		this.currentPlaybackType(Obj.PlaybackType.LINEAR_AD);
	};
	
	//Is the framework in linear ad mode?
	/**
	* @fn		isLinearAdMode
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isLinearAdMode =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isLinearAdMode = function() {
		return this._isLinearAdMode;
	};

	/**
	* @fn		isMuted
	* @brief	
	*
	* @param[in]/[out]	: truth
	* @return			: Obj.prototype.isMuted =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isMuted = function(truth) {
		if(typeof truth !== "undefined") { 
			this._isMuted = truth; 
		}
		else { 
			return this._isMuted; 
		}
	};
	
	//Is the framework in VPAID Hault State
	Obj.prototype.hasHaltedForVPAID = function(truth) {
		if (typeof truth !== "undefined") {
			this._hasHaltedForVPAID = truth;
		} else {
			return this._hasHaltedForVPAID;
		}
	};

	
	//Sets a function to execute that is allowed to influence the linear ad URL by giving a String return value. Useful for login/token purposes
	/**
	* @fn		setLinearAdUrlModifier
	* @brief	
	*
	* @param[in]/[out]	: func
	* @return			: Obj.prototype.setLinearAdUrlModifier =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setLinearAdUrlModifier = function(func) {
		if(typeof func !== "undefined") { 
			this._linearAdUrlModifierFunction = func; 
		}
		else { 
			return this._linearAdUrlModifierFunction; 
		}
	};
	
	//A timeout that the contentManager uses in order to detect failures to load linear ads
	/**
	* @fn		linearAdTimeout
	* @brief	
	*
	* @param[in]/[out]	: timeout
	* @return			: Obj.prototype.linearAdTimeout =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.linearAdTimeout = function(timeout) {
		if(typeof timeout !== "undefined") { 
			this._linearAdTimeout = timeout; 
		}
		else {
			return this._linearAdTimeout; 
		}
	};
	
	//jQuery style getters/setters
	/**
	* @fn		currentVideoURL
	* @brief	
	*
	* @param[in]/[out]	: newURL
	* @return			: Obj.prototype.currentVideoURL =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.currentVideoURL = function(newURL) {
		if(typeof newURL !== "undefined") {
			this._currentVideoURL = newURL; 
		}
		else {
			return this._currentVideoURL; 
		}
	};
	
	/**
	* @fn		currentContentVideoURL
	* @brief	
	*
	* @param[in]/[out]	: newURL
	* @return			: Obj.prototype.currentContentVideoURL =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.currentContentVideoURL = function(newURL) {
		if(typeof newURL !== "undefined") {
			this._currentContentVideoURL = newURL; 
		}
		else {
			return this._currentContentVideoURL; 
		}
	};
	
	/**
	* @fn		currentPlaybackType
	* @brief	
	*
	* @param[in]/[out]	: newType
	* @return			: Obj.prototype.currentPlaybackType =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.currentPlaybackType = function(newType) {
		if(typeof newType !== "undefined") {
			this._currentPlaybackType = newType; 
		}
		else {
			return this._currentPlaybackType; 
		}
	};
	
	/**
	* @fn		currentPlayhead
	* @brief	
	*
	* @param[in]/[out]	: newPlayhead
	* @return			: Obj.prototype.currentPlayhead =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.currentPlayhead = function(newPlayhead) {
		if(typeof newPlayhead !== "undefined") {
			this._currentPlayhead = newPlayhead; 
		}
		else {
			return this._currentPlayhead; 
		}
	};
	
	/**
	* @fn		currentContentPlayhead
	* @brief	
	*
	* @param[in]/[out]	: newPlayhead
	* @return			: Obj.prototype.currentContentPlayhead =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.currentContentPlayhead = function(newPlayhead) {
		if(typeof newPlayhead !== "undefined") { 
			this._currentContentPlayhead = newPlayhead;
		}
		else {
			return this._currentContentPlayhead; 
		}
	};
	
	/**
	* @fn		currentAdPlayhead
	* @brief	
	*
	* @param[in]/[out]	: newPlayhead
	* @return			: Obj.prototype.currentAdPlayhead =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.currentAdPlayhead = function(newPlayhead) {
		if(typeof newPlayhead !== "undefined") { 
			this._currentAdPlayhead = newPlayhead; 
		}
		else {
			return this._currentAdPlayhead; 
		}
	};
	
	/**
	* @fn		currentAdDuration
	* @brief	
	*
	* @param[in]/[out]	: newPlayhead
	* @return			: Obj.prototype.currentAdDuration =
	* @warning			: None
	* @exception		: None
	* @see
	*/	
	
	Obj.prototype.currentBreakDuration = function(newPlayhead) {
		if(typeof newPlayhead !== "undefined") { 
			this._currentBreakDuration = this._currentBreakDuration + newPlayhead; 
		}
		else {
			return this._currentBreakDuration; 
		}
	};
	
	/**
	* @fn		currentAdBreak
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.currentAdBreak =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.currentAdBreak = function(newObject) {
		if(typeof newObject !== "undefined") { 
			this._currentAdBreak = newObject; }
		else { 
			return this._currentAdBreak; 
		}
	};
	
	/**
	* @fn		currentLinearAd
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.currentLinearAd =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.currentLinearAd = function(newObject) {
		if(typeof newObject !== "undefined") { 
			this._currentLinearAd = newObject; 
		}
		else { 
			return this._currentLinearAd;
		}
	};
	
	/**
	* @fn		currentCompanionAd
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.currentCompanionAd =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.currentCompanionAd = function(newObject) {
		if(typeof newObject !== "undefined") { 	
			this._currentCompanionAd = newObject; 
		}
		else {
			return 	this._currentCompanionAd; 
		}
	};
	
	/**
	* @fn		currentLinearCreative
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.currentLinearCreative =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.currentLinearCreative = function(newObject) {
		if(typeof newObject !== "undefined") { 
			this._currentLinearCreative = newObject;
		}
		else {
			return this._currentLinearCreative; 
		}
	};
	
	/**
	* @fn		currentEvent
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.currentEvent =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.currentEvent = function(newObject) {
		if(typeof newObject !== "undefined") { 
			this._currentEvent = newObject; 
		}
		else {
			return this._currentEvent; 
		}
	};
	
	/**
	* @fn		currentAdList
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.currentAdList =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.currentAdList = function(newObject) {
		if(typeof newObject !== "undefined") { 
			this._currentAdList = newObject; 
		}
		else {
			return this._currentAdList; 
		}
	};
	
	/**
	* @fn		currentAdType
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.currentAdType =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.currentAdType = function(newObject) {
		if(typeof newObject !== "undefined") { 
			this._currentAdType = newObject; 
		}
		else {
			return this._currentAdType;
		}
	};
	
	/**
	* @fn		contentSeekTime
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.contentSeekTime =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.contentSeekTime = function(newObject) {
		if(typeof newObject !== "undefined") { 
			this._contentSeekTime = newObject; 
			this.accumulatedSeekTime(this._contentSeekTime);
		}
		else { 
			return this._contentSeekTime; 
		}
	};
	
	/**
	* @fn		getCurrentContentPlayTime
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getCurrentContentPlayTime =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getCurrentContentPlayTime = function() {
		return ( this._currentContentPlayhead + this._contentSeekTime);
	};
	
	/**
	* @fn		isFullscreen
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.isFullscreen =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isFullscreen = function(newObject){
		if(typeof newObject !== "undefined") { 
			this._isFullscreen = newObject;
		}
		else{
			return this._isFullscreen;
		}
	};
	
	/**
	* @fn		accumulatedSeekTime
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.accumulatedSeekTime =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.accumulatedSeekTime = function(newObject){
		if(typeof newObject !== "undefined") { 
			this._accumulatedSeekTime += newObject;
		}
		else{
			return this._accumulatedSeekTime; 
		}
	};
	
	/**
	* @fn		startPlaybackTime
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.startPlaybackTime =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.startPlaybackTime = function(newObject){
		if(typeof newObject !== "undefined") { 
			this._startPlaybackTime = newObject; 
		}
		else{
			return this._startPlaybackTime; 
		}
	};
	
	/**
	* @fn		contentDuration
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.contentDuration =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.contentDuration = function(newObject){
		if(typeof newObject !== "undefined") { 
			this._contentDuration = newObject; 
		}
		else{	
			return this._contentDuration; 
		}
	};
	
	/**
	* @fn		contentDisplayArea
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.contentDisplayArea =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.contentDisplayArea = function(newObject){
		if(typeof newObject !== "undefined") { 
			this._contentArea = newObject; 
		}
		else{	
			return this._contentArea;
		}
	};
	
	/**
	* @fn		currentAdRegion
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.currentAdRegion =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.currentAdRegion = function(newObject){
		if(typeof newObject !== "undefined") { 
			this._currentAdRegion = newObject; 
		}
		else{	return this._currentAdRegion; }
	};
	
	/**
	* @fn		prebufferedLinearAd
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.prebufferedLinearAd =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.prebufferedLinearAd = function(newObject) {
		if(typeof newObject !== "undefined") { 
			this._prebufferedLinearAd = newObject;
		}
		else {
			return this._prebufferedLinearAd;
		}
	};

	//Current linear ad break that is being buffered.
	/**
	* @fn		prebufferedLinearAdBreak
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.prebufferedLinearAdBreak =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.prebufferedLinearAdBreak = function(newObject) {
		if(typeof newObject !== "undefined") { 
			this._prebufferedLinearAdBreak = newObject;
		}
		else {
			return this._prebufferedLinearAdBreak; 
		}
	};

	/**
	* @fn				: currentNonLinearAdBreak
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.currentNonLinearAdBreak =
	* @warning			: None
	* @exception		: None
	* @see
	*/
		//Current nonlinear ad break that is scheduled for display at next opportunity.
	Obj.prototype.currentNonLinearAdBreak = function(newObject) {
		if(typeof newObject !== "undefined") {
			this._currentNonLinearAdBreak = newObject; 
		}
		else { 
			return this._currentNonLinearAdBreak; 
		}
	};


	//Current Non linear VPaid ad that is loaded
	Obj.prototype.currentPreloadedNonLinearVPAIDAd = function(newObject) {

		if (typeof newObject !== "undefined") {
			this._currentPreloadedNonLinearVPAIDAd = newObject;
		} else {
			return this._currentPreloadedNonLinearVPAIDAd;
		}
	};
	
	
	//Current linear VPaid ad that is loaded
	Obj.prototype.currentPreloadedLinearVPAIDAd = function(newObject) {

		if (typeof newObject !== "undefined") {
			this._currentPreloadedLinearVPAIDAd = newObject;
		} else {
			return this._currentPreloadedLinearVPAIDAd;
		}
	};
	/**
	* @fn				: currentNonLinearAd
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.currentNonLinearAd =
	* @warning			: None
	* @exception		: None
	* @see
	*/	
	//Queue an ad with a nonlinear creative
	Obj.prototype.currentNonLinearAd = function(newObject) {
		if(typeof newObject !== "undefined" && newObject) {
			this._currentNonLinearAd.push(newObject); 
		}
		else if(!newObject && this._currentNonLinearAd.length > 0){ 
			this._currentNonLinearAd.shift(); 
		}
		else{
			;	//Error
		}
		
		return this._currentNonLinearAd.length;
	};
	
	/**
	* @fn				: getCurrentNonLinearAd
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.getCurrentNonLinearAd
	* @warning			: None
	* @exception		: None
	* @see
	*/	
	//Get An ad with a nonlinear, scheduled to play at the next opportunity.
	Obj.prototype.getCurrentNonLinearAd = function() {
		
		if(this._currentNonLinearAd.length > 0){ 
			return this._currentNonLinearAd[0]; 
		}
		else{
			return null;	
		}
	};
	
	/**
	* @fn				: getNonLinearAdLen
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.getNonLinearAdLen
	* @warning			: None
	* @exception		: None
	* @see
	*/	
	//Get NonLinear Ad List length
	Obj.prototype.getNonLinearAdLen = function() {
		
		if(this._currentNonLinearAd.length > 0){ 
			return this._currentNonLinearAd.length; 
		}
		else{
			return 0;	
		}
	};	
	
	/**
	* @fn		contentState
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.contentState =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.contentState = function(newObject){
		if(typeof newObject !== "undefined") { 
			this._contentState = newObject; 
		}
		else{	
			return this._contentState;
		}
	};
	
	/**
	* @fn		hasContentVideo
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.hasContentVideo =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.hasContentVideo = function(newObject){
		if(typeof newObject !== "undefined") { 
			this._hasContentVideo = newObject; 
		}
		else{	
			return this._hasContentVideo; 
		}
	};
	
	/**
	* @fn		hasContentAudio
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.hasContentAudio =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.hasContentAudio = function(newObject){
		if(typeof newObject !== "undefined") { 
			this._hasContentAudio = newObject; 
		}
		else{	
			return this._hasContentAudio;
		}
	};
	
	/**
	* @fn		hasContentCaption
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.hasContentCaption =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.hasContentCaption = function(newObject){
		if(typeof newObject !== "undefined") { 
			this._hasContentCaption = newObject; 
		}
		else{	
			return this._hasContentCaption; 
		}
	};

	/**
	* @fn		contentWidth
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.contentWidth =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.contentWidth = function(newObject){
		if(typeof newObject !== "undefined") { 
			this._contentWidth = newObject; 
		}
		else{
			return this._contentWidth; 
		}
	};

	/**
	* @fn		contentHeight
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.contentHeight =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.contentHeight = function(newObject){
		if(typeof newObject !== "undefined") { 
			this._contentHeight = newObject; 
		}
		else{	
			return this._contentHeight; 
		}
	};
	
	/**
	* @fn		contentBitrate
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.contentBitrate =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.contentBitrate = function(newObject){
		if(typeof newObject !== "undefined" && newObject > 0) {
			if( this._contentBitrate !== newObject ){
				this._contentBitrate = newObject; 
				return true;
			}
			return false;
		}
		else{
			return this._contentBitrate;
		}
	};
		//Sets a function to execute before starting/resuming content. Useful for DRM purposes
	/**
	* @fn		beforeContentStart
	* @brief	
	*
	* @param[in]/[out]	: func
	* @return			: Obj.prototype.beforeContentStart =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.beforeContentStart = function(func) {
		if (typeof func !== "undefined") {
			this._beforeContentStartFunction = func;
		} else {
			return this._beforeContentStartFunction;
		}
	};

	//Sets a function to execute before starting linear ad playback. Useful for DRM purposes
	/**
	* @fn		beforeLinearAdStart
	* @brief	
	*
	* @param[in]/[out]	: func
	* @return			: Obj.prototype.beforeLinearAdStart =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.beforeLinearAdStart = function(func) {
		if (typeof func !== "undefined") {
			this._beforeLinearAdStartFunction = func;
		} else {
			return this._beforeLinearAdStartFunction;
		}
	};

	//Sets a function to execute after starting/resuming content. Useful for DRM purposes
	Obj.prototype.afterContentStart = function(func) {
		if (typeof func !== "undefined") {
			this._afterContentStartFunction = func;
		} else {
			return this._afterContentStartFunction;
		}
	};

	//Sets a function to execute after starting linear ad playback. Useful for DRM purposes
	Obj.prototype.afterLinearAdStart = function(func) {
		if (typeof func !== "undefined") {
			this._afterLinearAdStartFunction = func;
		} else {
			return this._afterLinearAdStartFunction;
		}
	};
	
	
	/**
	* @fn		defaultFullscreen
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.defaultFullscreen =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.defaultFullscreen = function(newObject){
		if(typeof newObject !== "undefined") { 
			this._defaultFullscreen = newObject; 
		}
		else{
			return this._defaultFullscreen; 
		}
	};
	
	/**
	* @fn		defaultWindow
	* @brief	
	*
	* @param[in]/[out]	: newObject
	* @return			: Obj.prototype.defaultWindow =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.defaultWindow = function(newObject){
		if(typeof newObject !== "undefined") { 
			this._defaultWindow = newObject; 
		}
		else{
			return this._defaultWindow; 
		}
	};
	
	/**
	* @fn		resetAdState
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.resetAdState =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.resetAdState = function() {
		this._currentAdList = null;
		this._currentAdBreak = null;
		this._currentAdType = Obj.AdType.NONE;
		this._currentEvent = webapis.adframework.ContentManager.MEvents.NONE;
		this._currentAdRegion = webapis.adframework.PlayerAdapter.DisplayArea.NONE;
	};
	
	/**
	* @fn				resetNonLinearAd
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.resetNonLinearAd
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.resetNonLinearAd = function() {
		if(this._currentNonLinearAdBreak){
			this._currentNonLinearAdBreak.triggerEventType(webapis.adframework.ContentManager.MEvents.NONE);
		}
		this._currentNonLinearAdBreak = null;
		this._currentNonLinearAd = [];
	};
	
	/**
	* @fn				: setNonLinearAd
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.setNonLinearAd
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setNonLinearAd = function(adBreak, adParam) {
		this.currentNonLinearAdBreak(adBreak);
		this.currentNonLinearAd(adParam);
	};

	return Obj;
}());

if (typeof window.webapis.adframework !== "object") {
	window.webapis.adframework = {};
}
webapis.adframework.ServerInterface = (function() {

	"use strict";

	var id;
	if(window.curWidget && window.curWidget.id) {
		id = window.curWidget.id;
	}

	//Determines whether tracker element can be fired or not
	var isAllowedToFireTracker = function(tracker) {
		if(tracker.getID().toLowerCase() === "impression" || tracker.getID().toLowerCase() === "firstquartile") {
			return true;
		}
		else {
			if(true) {
				return true;
			}
			else {
				return false;
			}
		}
	};

	//Given a Tracker object, fires its tracking URL.
		var ftHelper = function(tracker, contentPlayhead, adAssetURI) {
		if(isAllowedToFireTracker(tracker)) {
			var processedURL = webapis.adframework.MacroHelper.replaceTrackingMacros(tracker.getURL(), contentPlayhead, adAssetURI);
			webapis.adframework.utils.fireTrackerURL(processedURL);
			webapis.adframework.events.dispatch(webapis.adframework.events.TRACKING_EVENT, { event: tracker.getID(), url: processedURL });
		}
	};
	var fireTracker = function(tracker, contentPlayhead, adAssetURI) {
		ftHelper(tracker, contentPlayhead, adAssetURI);
	};
	return {
		fireTracker: fireTracker
	};
}());

/*
webapis.adframework.displayhandler
Contains functions to handle the display of various bits of information in VAST (such as the Skippable Linear Ad Offset UI).
An app developer is allowed to override these functions to fit their own UI.
*/

if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}

/**
 * @brief displayhandler Model.
 * @details A BluePrint of displayhandler Model
 * @return Null
 */

webapis.adframework.displayhandler = (function() {
	"use strict";
	var Obj = function() {
		
	};
	
	/**
	* @fn		init
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.init =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.init = function() {
		webapis.adframework.VisualOverlay.init();
		this.initSkipDisplayLogic();
		this.initIFramePauseLogic();
		this.initLinearClickLogic();
		this.initLinearIcons();
	};

	//Register event Listeners that pause the video upon iframe open, and resumes the video upon iframe close
	/**
	* @fn		initIFramePauseLogic
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.initIFramePauseLogic =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initIFramePauseLogic = function() {
		webapis.adframework.events.addListener(webapis.adframework.events.IFRAME_OPEN, function(evt, params) {
			if(typeof evt === "undefined" || typeof params === "undefined") {
				return;
			}
			webapis.adframework.core.pause(true);
			webapis.adframework.events.dispatch(webapis.adframework.events.ON_BROWSER_LOAD, { });
		});
		webapis.adframework.events.addListener(webapis.adframework.events.IFRAME_CLOSE, function(evt, params) {
			if(typeof evt === "undefined" || typeof params === "undefined") {
				return;
			}
			if (!params.overwritePause) {
				webapis.adframework.core.resume(true);
			}
			webapis.adframework.events.dispatch(webapis.adframework.events.ON_BROWSER_UNLOAD, { });
		});
	};
	
	/**
	* @fn		initLinearClickLogic
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.initLinearClickLogic =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initLinearClickLogic = function() {
		webapis.adframework.events.addListener(webapis.adframework.events.LINEAR_AD_START, function(evt, params){
			if(typeof evt === "undefined" || typeof params === "undefined") {
				return;
			}
			if (webapis.adframework.config.get("ENABLE_LINEAR_CLICK") === true) {
				webapis.adframework.VisualOverlay.showLinearClickFrame();
			}
		});
		webapis.adframework.events.addListener(webapis.adframework.events.LINEAR_AD_END, function(evt, params){
			if(typeof evt === "undefined" || typeof params === "undefined") {
				return;
			}
			webapis.adframework.VisualOverlay.hideLinearClickFrame();
		});
		webapis.adframework.events.addListener(webapis.adframework.events.CONTENT_START, function(evt, params){
			if(typeof evt === "undefined" || typeof params === "undefined") {
				return;
			}
			webapis.adframework.VisualOverlay.hideLinearClickFrame();
		});
	};

	//Calls updateSkipUI(secondsUntilSkippable)m
	/**
	* @fn		initSkipDisplayLogic
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.initSkipDisplayLogic =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initSkipDisplayLogic = function() {
		webapis.adframework.events.addListener(webapis.adframework.events.AD_PLAYBACK_TIME, function(evt, params){
			if(typeof evt === "undefined") {
				return;
			}
			if(typeof params.secondsUntilSkippable === 'number') {
				webapis.adframework.VisualOverlay.updateSkipUI(params.secondsUntilSkippable);
			}
			else {
					; /*NULL*/
			}
		});

		webapis.adframework.events.addListener(webapis.adframework.events.LINEAR_AD_START, function(evt, params){
			if(params.skippable === true) {
				webapis.adframework.VisualOverlay.showSkipUI();
			}
		});
		
		webapis.adframework.events.addListener(webapis.adframework.events.LINEAR_AD_END, function(evt, params){
			if(typeof evt === "undefined" || typeof params === "undefined") {
				return;
			}
			webapis.adframework.VisualOverlay.hideSkipUI();
		});

		webapis.adframework.events.addListener(webapis.adframework.events.CONTENT_START, function(evt, params){
			if(typeof evt === "undefined" || typeof params === "undefined") {
				return;
			}
			webapis.adframework.VisualOverlay.hideSkipUI();
		});

	};

	/**
	* @fn		initLinearIcons
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.initLinearIcons =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initLinearIcons = function() {
		webapis.adframework.events.addListener(webapis.adframework.events.LINEAR_AD_START, function(evt, params){
			if(typeof evt === "undefined") {
				return;
			}
			if(params.icons) {
				webapis.adframework.VisualOverlay.loadLinearIcons(params.icons);
			}
		});		
		webapis.adframework.events.addListener(webapis.adframework.events.LINEAR_AD_END, function(evt, params){
			if(typeof evt === "undefined" || typeof params === "undefined") {
				return;
			}
			webapis.adframework.VisualOverlay.destroyLinearIcons();
		});
	};

	/**
	* @fn		hideSkipButton
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.hideSkipButton =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.hideSkipButton = function() {
		webapis.adframework.VisualOverlay.hideSkipUI();
	};
	
	return new Obj();
})();


/*
webapis.adframework.displayhandler
Contains functions to handle the display of various bits of information in VAST (such as the Skippable Linear Ad Offset UI).
An app developer is allowed to override these functions to fit their own UI.
*/

if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}
/**
 * @brief VisualOverlay Model.
 * @details A BluePrint of VisualOverlay Model
 * @return Null
 */
webapis.adframework.VisualOverlay = (function() {
	"use strict";
	var Obj = function() {
		try {
			this.widgetAPI = new Common.API.Widget();
		} catch (e) {
			this.widgetAPI = null;
		}		
	};
	
	var self = null;
	
	Obj.NonLinearResource = {
		STATIC_IMAGE: "STATIC_IMAGE",
		STATIC_JS: "STATIC_JS",
		STATIC_FLASH: "STATIC_FLASH",
		IFRAME: "IFRAME",
		HTML: "HTML"
	};
	
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj.NonLinearResource);
	}
	
	Obj.AdCategory = {
		LINEAR_AD: "LINEAR_AD",
		NONLINEAR_AD: "NONLINEAR_AD",
		INTERACTIVE_AD: "INTERACTIVE_AD"
	};
	
	if(typeof Object.freeze === "function") { 
		Object.freeze(Obj.AdCategory);
	}

	/**
	* @fn		init
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.init =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.init = function() {
		if(this._alreadyInitialized === true) {
			return; 
		}
		this._alreadyInitialized = true;
		self = this;
		this.initSkipUI();
		this.initIFrameUI();
		this.initLinearUI();
		this.initNonLinearUI();
		this.initLinearIconUI();
		this.initVPAIDUI();
		webapis.adframework.core.getPlayer().addListener(webapis.adframework.PlayerAdapter.events.DISPLAY_AREA_CHANGED, function(evt, params){
			self.scaleUI.call(self, evt, params);
		});
		
		webapis.adframework.events.addListener(webapis.adframework.events.LINEAR_AD_START, function(evt, params) {
			self.hideNonLinearAd.call(self, true);
			self.showLinearClickFrame.call(self, params.adID);
		});
		
		webapis.adframework.events.addListener(webapis.adframework.events.CLOSE_NONLINEAR, function() {
			self.hideNonLinearAd.call(self, true);
		});
		
		webapis.adframework.events.addListener(webapis.adframework.events.NONLINEAR_DETECTED, function(evt, params) {
			self.showNonLinearAd.call(self, params);
		});
		
		webapis.adframework.events.addListener(webapis.adframework.events.INITIALIZE_VPAID, function(evt, params) {
			self.initVPAID.call(self, params);
		});
		
		webapis.adframework.events.addListener(webapis.adframework.events.START_VPAID, function() {
			self.startVPAID.call(self);
		});
	};
	
	//Given a set of dimms that are in 960x540 format, scales them up to the window's true size
	/**
	* @fn		scaleFrom960
	* @brief	
	*
	* @param[in]/[out]	: params
	* @return			: Obj.prototype.scaleFrom960 =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.scaleFrom960 = function(params) {
		if(!this.xScale) {
			this.xScale = window.innerWidth/1920;
			this.yScale = window.innerHeight/910;
		}

		params.x = Math.floor(params.x * this.xScale);
		params.w = Math.floor(params.w *this.xScale);
		
		params.y = Math.floor(params.y *this.yScale);
		params.h = Math.floor(params.h *this.yScale);
		
		return params;
	};
	/**
	* @fn		initIFrameUI
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.initIFrameUI =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initIFrameUI = function() {

		var self = this;

		this.iframeContainer = document.createElement("div");
		this.iframeOverlay = document.createElement("div");
		this.iframeCloseButton = document.createElement("div");
		this.iframeWindow = document.createElement("iframe");
		
		this.iframeContainer.className = "iab-visualoverlay-iframe-container";
		this.iframeOverlay.className = "iab-visualoverlay-iframe-overlay";
		this.iframeCloseButton.className = "iab-visualoverlay-iframe-closebutton";
		this.iframeWindow.className = "iab-visualoverlay-iframe-window";
		this.iframeWindow.sandbox = "";

		this.iframeContainer.appendChild(this.iframeOverlay);
		this.iframeContainer.appendChild(this.iframeCloseButton);
		this.iframeContainer.appendChild(this.iframeWindow);

		var closeOnClickFunc = function() {
			self.closeIFrame();
			if(self.nonLinearDisplayTime > 0 && typeof self.tempShowNonLinearAd !== "undefined" && self.tempShowNonLinearAd) {
				self.showNonLinearAd(self.tempShowNonLinearAd);
			}
		};

		this.iframeCloseButton.addEventListener("click", closeOnClickFunc);
		this.iframeOverlay.addEventListener("click", closeOnClickFunc);
		this.closeIFrame();
		document.body.appendChild(this.iframeContainer);
	};

	//Get the current URL of the iFrame
	/**
	* @fn		getIFrameSrc
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.getIFrameSrc =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.getIFrameSrc = function() {
		return this.iframeWindow.src || null;
	};

	//Show the iFrame and set its SRC to the given URL.
	/**
	* @fn		openIFrame
	* @brief	
	*
	* @param[in]/[out]	: src
	* @return			: Obj.prototype.openIFrame =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.openIFrame = function(src) {
		if (webapis.adframework.config.get("OVERLAY_POSITION") === webapis.adframework.config.OVERLAY_POSITION.DISABLED) {
			return false;
		}
		try {
			this.iframeWindow.src = src;
			this.iframeContainer.style.display = "block";
			this.iframeWindow.focus();
			webapis.adframework.events.dispatch(webapis.adframework.events.IFRAME_OPEN, {
				src: src
			});
			return true;
		} catch (e) {
				; /*NULL*/
		}
		 return false;
	};

	//Close the iFrame
	/**
	* @fn		closeIFrame
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.closeIFrame =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.closeIFrame = function() {
		try {
			this.iframeContainer.style.display = "none";
			this.iframeWindow.src = "";
			if (this.iframeWindow.isVPAID) {
                webapis.adframework.events.dispatch(webapis.adframework.events.IFRAME_CLOSE, {
                    overwritePause: true
                });
            } else {
				webapis.adframework.events.dispatch(webapis.adframework.events.IFRAME_CLOSE);
			}
		} catch (e) {
				; /*NULL*/
		}
	};

	/**
	* @fn		setIFrameSandboxParameters
	* @brief	
	*
	* @param[in]/[out]	: str
	* @return			: Obj.prototype.setIFrameSandboxParameters =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.setIFrameSandboxParameters = function(str) {
		if (str) {
			this.iframeWindow.sandbox = str;
		} else {
            this.iframeWindow.sandbox = "";
		}
	};
	
    Obj.prototype.setIFrameFromVPAID = function() {
        this.iframeWindow.isVPAID = true;
    };
    //***************************************** VPAID IFRAME *****************************************
    Obj.prototype.initVPAIDUI = function() {
        this.vpaidContainer = document.createElement("div");
        this.vpaidContainer.className = "iab-visualoverlay-vpaidframe iab-visualoverlay-hidden";
        this.vpaidContainer.id = "vc1";
        document.body.appendChild(this.vpaidContainer);

        this.vpaidContainer_2 = document.createElement("div");
        this.vpaidContainer_2.className = "iab-visualoverlay-vpaidframe iab-visualoverlay-hidden";
        this.vpaidContainer_2.id = "vc2";
        document.body.appendChild(this.vpaidContainer_2);
    };

    /**
     * [initVPAID initiating VPAID - Loading remote script into a sandbox iframe to avoid DOM polluting]
     * @param  {[type]} adCreative [description]
     * @param  {[type]} type       ['linear','nonlinear']
     */
    Obj.prototype.initVPAID = function(param) {
        if (this.VPAIDWrapper instanceof webapis.adframework.VPAIDWrapper) {
            webapis.adframework.events.dispatch("DEBUG_MESSAGE", {
                message: "PreBuffer VPAID"
            });
            return false; // Fixed for a issue, Do not prebuffer if VPAID already in playing state.
        } else {
            this.currentVPAIDObj = {};
        }

        var self = this;
        var url;
		
		if(typeof this.bufferingVPAIDObj.isPrebuffered !== "undefined" || this.bufferingVPAIDObj.isPrebuffered) {
			this.VPAIDClean();
		}
		
		
        //the variable that store all the current VPAID meta
        this.bufferingVPAIDObj = {};
		this.bufferingVPAIDObj.isPrebuffered = false;
		this.bufferingVPAIDObj.adload = false;
        this.bufferingVPAIDObj.VPAIDType = param.type;
        this.bufferingVPAIDObj.initPromise = new webapis.adframework.Promise();
        this.bufferingVPAIDObj.initPromise.onSuccess(function() {
            self.bufferingVPAIDObj.isLoaded = true;
        });

        if ('linear' === param.type) {
            url = param.url; 
            this.bufferingVPAIDObj.vpaidAdParameters = param.adParameters;   
        } else if ('nonlinear' === param.type) {
            url = param.url;  
            this.bufferingVPAIDObj.vpaidAdParameters = param.adParameters; 
            this.bufferingVPAIDObj.vpaidDisplayMS = param.displayTime;  
        } else {
            return;
        }
		this.bufferingVPAIDObj.ad = param.ad;
        this.bufferingVPAIDObj.adID = param.ad.uid;
        this.bufferingVPAIDObj.VPAIDUrl = url;

        // Load the VPAID ad unit


        var vpaidFrame = document.createElement('iframe');
        vpaidFrame.style.display = 'none';
        vpaidFrame.src = "about:self";
        document.body.appendChild(vpaidFrame);
        
            var vpaidLoader = vpaidFrame.contentWindow.document.createElement('script');
            vpaidLoader.src = url;
            vpaidLoader.onload = function() {
                self.VPAIDIFrameCallback();
            };
            vpaidLoader.onerror = function() {
                webapis.adframework.events.dispatch("VPAID_ERROR", {
                    errorMessage: "FAIL to load VPAID Ad Unit JavaScript File"
                });
                return;
            };
            vpaidFrame.contentWindow.document.body.appendChild(vpaidLoader);
            vpaidLoader = vpaidFrame.contentWindow.document.createElement('script');
            vpaidLoader.innerText = "inDapIF = true;window.top = window;window.parent = window;window.frameElement = null;";
            vpaidFrame.contentWindow.document.body.appendChild(vpaidLoader);
	 
        this.bufferingVPAIDObj.vpaidFrame = vpaidFrame;
    };

    Obj.prototype.VPAIDIFrameCallback = function() {
        var vpaidProgram;
		
		if( typeof this.bufferingVPAIDObj === "undefined" || !this.bufferingVPAIDObj ||  typeof this.bufferingVPAIDObj.vpaidFrame === "undefined" || !this.bufferingVPAIDObj.vpaidFrame){
			return;
		}
		
        var fn = this.bufferingVPAIDObj.vpaidFrame.contentWindow.getVPAIDAd;
        if (fn && typeof fn === 'function') {
            vpaidProgram = fn();
        } else {
            webapis.adframework.events.dispatch("VPAID_ERROR", {
                errorMessage: "VPAID Ad Unit JavaScript File is not VALID"
            });
            return;
        }
        var VPAIDWrapper = null;
        try {
			VPAIDWrapper = new webapis.adframework.VPAIDWrapper(this.bufferingVPAIDObj.ad, this.bufferingVPAIDObj.VPAIDType/*this.bufferingVPAIDObj.vpaidCreative*/, vpaidProgram);
        } catch (e) {
            webapis.adframework.events.dispatch("VPAID_ERROR", {
                errorMessage: e
            });
        }
        if (!VPAIDWrapper) {
            return;
        }
        this.bufferingVPAIDObj.VPAIDWrapper = VPAIDWrapper;
        this.VPAIDLoad();
    };

    Obj.prototype.VPAIDLoad = function() {
        if (typeof this.bufferingVPAIDObj === "undefined" || !this.bufferingVPAIDObj || !this.bufferingVPAIDObj.VPAIDWrapper) {
            return;
        }
        var VPAIDWrapper = this.bufferingVPAIDObj.VPAIDWrapper;

        VPAIDWrapper.handshakeVersion("2.0");
        if (this.currentVPAIDContainer === this.vpaidContainer) {
            this.bufferingVPAIDContainer = this.vpaidContainer_2;
        } else {
            this.bufferingVPAIDContainer = this.vpaidContainer;
        }
        var creativeData = {
                AdParameters: (this.bufferingVPAIDObj.vpaidAdParameters) ? this.bufferingVPAIDObj.vpaidAdParameters : ""
            },
            environmentVars = {
                slot: this.bufferingVPAIDContainer,
                videoSlotCanAutoPlay: true
            };
        var width = 1920,
            height = 910;
        if (this.scaledDimms) {
            width = this.scaledDimms.w;
            height = this.scaledDimms.h;
        }
        VPAIDWrapper.initAd(width, height, 'normal', 512, creativeData, environmentVars, this.bufferingVPAIDObj.vpaidDisplayMS);
    };

    Obj.prototype.startVPAID = function() {
        var self = this;

        //Close any active VPAID ads
		if (this.currentVPAIDObj && this.currentVPAIDObj.VPAIDWrapper) {
			this.currentVPAIDObj.VPAIDWrapper.stopAd();
		}
        if (!this.bufferingVPAIDObj || !this.bufferingVPAIDObj.initPromise) {
			webapis.adframework.events.dispatch("VPAID_ERROR", {
                errorMessage: "FAILED to Start VPAID (currentVPAIDObj is null or initPromise is null)"
            });
            return;
        }
		
		if(typeof this.bufferingVPAIDObj !== "undefined" && this.bufferingVPAIDObj && (typeof self.currentVPAIDObj.VPAIDWrapper === "undefined" || !self.currentVPAIDObj.VPAIDWrapper) && this.bufferingVPAIDObj.adload){
			this.onStartVPAID();
		}
		else{
			this.bufferingVPAIDObj.initPromise.onSuccess(this.onStartVPAID);
		}
    };
	
	Obj.prototype.onStartVPAID = function(){

		self.scaleUI();
		self.bufferingVPAIDObj.adload = false;
		self.currentVPAIDObj = self.bufferingVPAIDObj;
		self.VPAIDWrapper = self.currentVPAIDObj.VPAIDWrapper;
		if (self.currentVPAIDObj.VPAIDType === 'nonlinear') {
			if (typeof self.nonLinearAdID !== "undefined" && self.nonLinearAdID.length > 0 && self.nonLinearAdID !== self.currentVPAIDObj.adID) {
				self.hideNonLinearAd(true);
			}
			self.nonLinearAdID = self.currentVPAIDObj.adID;
		}
		self.currentVPAIDContainer = self.bufferingVPAIDContainer;
		self.currentVPAIDContainer.className = "iab-visualoverlay-vpaidframe";
		webapis.adframework.events.dispatch("DEBUG_MESSAGE", {
			message: "Start VPAID"
		});
		self.VPAIDWrapper.startAd();
		self.currentVPAIDObj.hasStarted = true;
    };
	
    Obj.prototype.VPAIDStopAllVideo = function() {

		if(typeof this.currentVPAIDContainer === "undefined" || !this.currentVPAIDContainer){
			return;
		}
		
        try {
            var videos = this.currentVPAIDContainer.getElementsByTagName("video");
            for (var i = 0; i < videos.length; i++) {
                try {
                    var videoTag = videos[i];
                    videoTag.pause();
                    videoTag.removeAttribute("src");
                    videoTag.load();
                } catch (e) {
                    webapis.adframework.events.dispatch("DEBUG_MESSAGE", {
                        message: "Failed to stop video: " + e
                    });
                }
            }
        } catch (e) {
            webapis.adframework.events.dispatch("DEBUG_MESSAGE", {
                message: "Failed to stop video: " + e
            });
        }
    };

    /**
     * [VPAIDClean Clean up Resource beforeSetup/onComplete/onError]
     */
    Obj.prototype.VPAIDClean = function() {
        if (this.currentVPAIDObj) {
            //Remove VPAID element if existed
            if (this.currentVPAIDObj.vpaidFrame && this.currentVPAIDObj.vpaidFrame.parentNode) {
                this.currentVPAIDObj.vpaidFrame.parentNode.removeChild(this.currentVPAIDObj.vpaidFrame);
            }
            this.VPAIDStopAllVideo();
            if (this.currentVPAIDObj.VPAIDType === "nonlinear") {
                this.hideNonLinearAd();
                this.nonLinearAd = null;
            }
			this.currentVPAIDObj.hasStarted = false;
			webapis.adframework.events.dispatch(webapis.adframework.events.VPAID_EVENT, "close");
            this.currentVPAIDObj = {};
        }
        this.vpaidAd = null;
        this.VPAIDWrapper = null;
        this.iframeWindow.isVPAID = false;
        if (this.currentVPAIDContainer) {
            this.currentVPAIDContainer.innerHTML = "";
            this.currentVPAIDContainer.className = "iab-visualoverlay-hidden iab-visualoverlay-vpaidframe";
        }
		this.bufferingVPAIDObj = {};
    };

    //Positions the Linear Industry Icon display element based on the size and position of the video frame
    Obj.prototype.positionVPAID = function(scaled) {
        if(!scaled) {
            return;
        }
        this.vpaidContainer.style.left = scaled.x + 'px';
        this.vpaidContainer.style.top = scaled.y + 'px';
        this.vpaidContainer_2.style.left = scaled.x + 'px';
        this.vpaidContainer_2.style.top = scaled.y + 'px';
    };

    //Scales the NonLinear display element based on the size of the video frame
    Obj.prototype.scaleVPAID = function(scaled) {

        if(!scaled) {
            return;
        }

        if (this.currentVPAIDObj && this.currentVPAIDObj.VPAIDWrapper) {
            this.currentVPAIDObj.VPAIDWrapper.resizeAd(scaled.w, scaled.h, 'normal');
        }
        if (this.bufferingVPAIDObj && this.bufferingVPAIDObj.VPAIDWrapper) {
            this.bufferingVPAIDObj.VPAIDWrapper.resizeAd(scaled.w, scaled.h, 'normal');
        }

        this.vpaidContainer.style.width = scaled.w + "px";
        this.vpaidContainer.style.height = scaled.h + "px";
        this.vpaidContainer_2.style.width = scaled.w + "px";
        this.vpaidContainer_2.style.height = scaled.h + "px";
    };

//***************************************** LINEAR *****************************************
	/**
	* @fn		initLinearUI
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.initLinearUI =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initLinearUI = function() {
		var self = this;

		var div = document.createElement("div");
		div.className = "iab-visualoverlay-linearclickframe iab-visualoverlay-hidden";
		div.addEventListener("click", function() {
			self.handleVideoClick();
		});
		document.body.appendChild(div);
		this.linearClickFrame = div;
	};

	/**
	* @fn		showLinearClickFrame
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.showLinearClickFrame =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.showLinearClickFrame = function(adID) {
		this.linearAdID = adID;
		this.linearClickFrame.className = "iab-visualoverlay-linearclickframe";
        
		if(this.scaledDimms) {
            this.positionLinearClickFrame(this.scaledDimms);
        }
        
        else {
            try {
                this.positionLinearClickFrame(webapis.adframework.core.getPlayer().getCorrectedDisplayArea());
            }
            catch(e) {
				;/*NULL*/
			}
        }
	};

	/**
	* @fn		hideLinearClickFrame
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.hideLinearClickFrame =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.hideLinearClickFrame = function() {
		this.linearClickFrame.className = "iab-visualoverlay-linearclickframe iab-visualoverlay-hidden";
	};

	/**
	* @fn		positionLinearClickFrame
	* @brief	
	*
	* @param[in]/[out]	: scaled
	* @return			: Obj.prototype.positionLinearClickFrame =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.positionLinearClickFrame = function(scaled) {
		if (webapis.adframework.config.get("ENABLE_LINEAR_CLICK") !== true || !scaled || !scaled.w || !scaled.h || !scaled.x || !scaled.y) {
			return;
		}

		//I want the linear click frame to be 90% of the width/height of the video frame, and positioned in the center
		var widthRatio = 0.9;
		var heightRatio = 0.9;

		var newWidth = (scaled.w * widthRatio);
		var newHeight = (scaled.h * heightRatio);

		this.linearClickFrame.style.width = newWidth + "px";
		this.linearClickFrame.style.height = newHeight + "px";
		this.linearClickFrame.style.left = (scaled.x + (scaled.w - newWidth) / 2) + "px";
		this.linearClickFrame.style.top = (scaled.y + (scaled.h - newHeight) / 2) + "px";
	};

	//Simulates a click on the Video ad.
	/**
	* @fn		simulateVideoClick
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.simulateVideoClick =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.simulateVideoClick = function() {
		this.handleVideoClick(this.linearAdID);
	};

	/**
	* @fn		handleVideoClick
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.handleVideoClick =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleVideoClick = function(adID) {
	    webapis.adframework.core.handleAdClick(adID, Obj.AdCategory.LINEAR_AD);
	};

	//***************************************** Linear Industry Icon  *****************************************

	//Create the Linear Industry Icon display element
	/**
	* @fn		initLinearIconUI
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.initLinearIconUI =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initLinearIconUI = function() {
		this.linearIconElements = [];

		if (!this.handleLinearIconLoad) {
			var tempFunc = function(iconElement) {
				iconElement.resource.handleDisplay();
			};
			this.handleLinearIconLoad = tempFunc.bind(this);
		}
	};
	
	/**
	* @fn		createIconElement
	* @brief	
	*
	* @param[in]/[out]	: icon
	* @return			: Obj.prototype.createIconElement =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.createIconElement = function(icon) {
		var self = this;

		if (!icon) {
			return;
		}
		var resource = icon.getPriorityIconResource();

		var icon_container = document.createElement("div");
		icon_container.resource = resource;
		icon_container.className = "iab-visualoverlay-linearicon iab-visualoverlay-hidden";
		icon_container.addEventListener("click", function(resource) {
			return function(e) {
				e.preventDefault();
				self.handleLinearIconClick(resource);
			};
		}(resource));
		icon_container.setAttribute("data-width", icon.getWidth());
		icon_container.setAttribute("data-height", icon.getHeight());
		icon_container.setAttribute("data-X", icon.getX());
		icon_container.setAttribute("data-Y", icon.getY());

		if (resource.getType() === "STATIC_IMAGE") {
			var img = document.createElement("img");
			img.style.width = icon.getWidth() + 'px';
			img.style.height = icon.getHeight() + 'px';
			img.src = resource.getContent();
			icon_container.appendChild(img);
		} else if (resource.getType() === "HTML") {
			icon_container.innerHTML = resource.getContent();
		} else if (resource.getType() === "IFRAME") {
			var iframe = document.createElement("iframe");
			iframe.style.width = icon.getWidth() + 'px';
			iframe.style.height = icon.getHeight() + 'px';
			iframe.src = encodeURI(resource.getContent());
			icon_container.appendChild(iframe);
		}
		else {
			;/*NULL*/
		}
		this.linearIconElements.push(icon_container);
		document.body.appendChild(icon_container);
		//Display Logic (offset/duration)
		this.showLinearIcon(icon_container, icon.getOffset(), icon.getDuration());
	};

	/**
	* @fn		loadLinearIcons
	* @brief	
	*
	* @param[in]/[out]	: icons
	* @return			: Obj.prototype.loadLinearIcons =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.loadLinearIcons = function(icons) {
		for (var i = 0; i < icons.length; i++) {
			this.createIconElement(icons[i]);
		}
		this.scaleLinearIcons(this.scaledDimms);
		this.positionLinearIcons(this.scaledDimms);
	};

	/**
	* @fn		showLinearIcon
	* @brief	
	*
	* @param[in]/[out]	: iconElement
	*					: offset
	*					: duration
	* @return			: Obj.prototype.showLinearIcon =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.showLinearIcon = function(iconElement, offset, duration) {
		//TODO handle display event
		var self = this;
		if (offset) {
			iconElement.t_offset = setTimeout(function(iconElement) {
				return function() {
					iconElement.className = 'iab-visualoverlay-linearicon';
					self.handleLinearIconLoad(iconElement);
				};
			}(iconElement), offset);

		} else {
			iconElement.className = 'iab-visualoverlay-linearicon';
			self.handleLinearIconLoad(iconElement);
		}
		if (duration) {
			iconElement.t_duration = setTimeout(function(iconElement) {
				return function() {
					self.destroyLinearIcon(iconElement);
				};
			}(iconElement), offset ? offset + duration : duration);
		}
	};

	/**
	* @fn		destroyLinearIcons
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.destroyLinearIcons =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.destroyLinearIcons = function() {
		var iconElements = [].slice.call(document.getElementsByClassName('iab-visualoverlay-linearicon'));
		for (var i = 0; i < iconElements.length; i++) {
			this.destroyLinearIcon(iconElements[i]);
		}
	};

	/**
	* @fn		destroyLinearIcon
	* @brief	
	*
	* @param[in]/[out]	: iconElement
	* @return			: Obj.prototype.destroyLinearIcon =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.destroyLinearIcon = function(iconElement) {
		if (iconElement) {
			iconElement.parentNode.removeChild(iconElement);
			clearTimeout(iconElement.t_offset);
			clearTimeout(iconElement.t_duration);
		}
	};

	//Positions the Linear Industry Icon display element based on the size and position of the video frame
	/**
	* @fn		positionLinearIcons
	* @brief	
	*
	* @param[in]/[out]	: scaled
	* @return			: Obj.prototype.positionLinearIcons =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.positionLinearIcons = function(scaled) {
		if (!this.linearIconElements || !scaled) {
			return;
		}
		var linearIconElements = this.linearIconElements;
		var lowerX = scaled.x + scaled.w;
		var lowerY = scaled.y + scaled.h;
		var upperX = scaled.x;
		var upperY = scaled.y;

		for (var i = 0; i < linearIconElements.length; i++) {
			var thislinearIconTarget;
            var thislinearIconElement = linearIconElements[i];

            if (thislinearIconElement.getAttribute("data-X") === 'left') {
                thislinearIconElement.style.left = (upperX + 5) + 'px';
            } else if (thislinearIconElement.getAttribute("data-X") === 'right') {
                thislinearIconTarget = thislinearIconElement.firstChild;
                thislinearIconElement.style.left = (lowerX - 5) - parseInt(thislinearIconTarget.style.width, 10) + 'px';
            } else {
                thislinearIconElement.style.left = upperX + parseInt(thislinearIconElement.getAttribute("data-X"), 10) + 'px';
            }
            if (thislinearIconElement.getAttribute("data-Y") === 'top') {
                thislinearIconElement.style.top = (upperY + 5) + 'px';
            } else if (thislinearIconElement.getAttribute("data-Y") === 'bottom') {
                thislinearIconTarget = thislinearIconElement.firstChild;
                thislinearIconElement.style.top = (lowerY - 5) - parseInt(thislinearIconTarget.style.height, 10) + 'px';
            } else {
                thislinearIconElement.style.top = upperY + parseInt(thislinearIconElement.getAttribute("data-Y"), 10) + 'px';
            }
        }
	};

	//Scales the NonLinear display element based on the size of the video frame
	/**
	* @fn		scaleLinearIcons
	* @brief	
	*
	* @param[in]/[out]	: scaled
	* @return			: Obj.prototype.scaleLinearIcons =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.scaleLinearIcons = function(scaled) {

		if (!this.linearIconElements || !scaled) {
			return;
		}
		var linearIconElements = this.linearIconElements;
		var thislinearIconElement;
		var thislinearIconTarget;

		//When Full Screen
		if (scaled.w === window.innerWidth) {
			for (var i = 0; i < linearIconElements.length; i++) {
				thislinearIconElement = linearIconElements[i];
				thislinearIconTarget = thislinearIconElement.firstChild;
				thislinearIconTarget.style.width = parseInt(thislinearIconElement.getAttribute("data-width"), 10) + "px";
				thislinearIconTarget.style.height = parseInt(thislinearIconElement.getAttribute("data-height"), 10) + "px";
			}
		} else {
			var widthRatio = scaled.w / window.innerWidth;
			var heightRatio = scaled.h / window.innerHeight;
            for (var x = 0; x < linearIconElements.length; x++) {
                thislinearIconElement = linearIconElements[x];
				thislinearIconTarget = thislinearIconElement.firstChild;
				thislinearIconTarget.style.width = Math.floor(parseInt(thislinearIconElement.getAttribute("data-width"), 10) * widthRatio) + "px";
				thislinearIconTarget.style.height = Math.floor(parseInt(thislinearIconElement.getAttribute("data-height"), 10) * heightRatio) + "px";
			}
		}
	};

	//If the Linear Icon Container creative is clicked, fire the acceptInvitation and clickTracking events, and open the iFrame to the clickThrough URL.
	/**
	* @fn		handleLinearIconClick
	* @brief	
	*
	* @param[in]/[out]	: resource
	* @return			: Obj.prototype.handleLinearIconClick =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.handleLinearIconClick = function(resource) {
		if (resource) {
			var clickThrough = resource.clickThrough;
			var clickTrackers = resource.clickTrackers;

			//Handle Click for Static Resource
			if (clickThrough && resource.getType() === 'STATIC_IMAGE') {
				//OPEN IFRAME
				webapis.adframework.VisualOverlay.openIFrame(clickThrough);
			//Handle Click for HTML Resource
			} else if (resource.getType() === 'HTML') {
				//Extracting url from Atag
				var regex_a_tag = /href=['"]([^'">]+)/i;
				clickThrough = regex_a_tag.exec(resource.content);
				if (clickThrough) {
					//OPEN IFRAME
					webapis.adframework.VisualOverlay.openIFrame(clickThrough[1]);
				}
			}
			else {
				;/*NULL*/
			}
			if (clickTrackers) {
				//SEND TRACKING
				resource.handleClick();
			}
		}
	};

		//***************************************** NONLINEAR *****************************************

	//Create the NonLinear display element and its close button
	Obj.prototype.initNonLinearUI = function() {
		var self = this;
        var tempFunc;
        var div;
		//Function to handle NonLinear resource timeouts
		if (!this.handleNonLinearTimeout) {
			tempFunc = function() {
				if (typeof this.nonLinearAdID === "undefined" || typeof this.nonLinearAdBreakID === "undefined" 
					|| !this.nonLinearAdID.length || !this.nonLinearAdBreakID.length) {
					return;
				} //Prevent double reporting
				clearTimeout(this.nonLinearResourceTimeout);
				this.nonLinearResourceTimeout = null;
				webapis.adframework.core.setApplicationError(Obj.AdCategory.NONLINEAR_AD,this.nonLinearAdBreakID, this.nonLinearAdID, 502, "Failed to fetch NonLinear ad - 404", this.nonLinearResource);
				this.hideNonLinearAd(true);
			};
			this.handleNonLinearTimeout = tempFunc.bind(this);
		}
		if (!this.handleNonLinearError) {
			tempFunc = function() {
			
				if (typeof this.nonLinearAdID === "undefined" || typeof this.nonLinearAdBreakID === "undefined" 
					|| !this.nonLinearAdID.length || !this.nonLinearAdBreakID.length) {
					return;
				} //Prevent double reporting
				clearTimeout(this.nonLinearResourceTimeout);
				this.nonLinearResourceTimeout = null;
				webapis.adframework.core.setApplicationError(Obj.AdCategory.NONLINEAR_AD,this.nonLinearAdBreakID, this.nonLinearAdID, 502, "Failed to fetch NonLinear ad - 404", this.nonLinearResource);
				this.hideNonLinearAd(true);
			};
			this.handleNonLinearError = tempFunc.bind(this);
		}
		if (!this.handleNonLinearLoad) {
			tempFunc = function() {
				clearTimeout(this.nonLinearResourceTimeout);
				this.nonLinearResourceTimeout = null;
				webapis.adframework.core.handleNonLinearTracking(this.nonLinearAdID, "impression");
				webapis.adframework.core.handleNonLinearTracking(this.nonLinearAdID, "creativeView");
			};
			this.handleNonLinearLoad = tempFunc.bind(this);
		}

		//Create the display element
		div = document.createElement("div");
		div.className = "iab-visualoverlay-nonlinearui iab-visualoverlay-hidden";
		document.body.appendChild(div);
		this.nonLinearDisplayElement = div;

		//Create the container holding ad
		div = document.createElement("div");
		div.className = "iab-visualoverlay-nonlinearui iab-visualoverlay-nonlinearui-container";
		div.addEventListener("click", function() {
			self.handleNonLinearClick();
		});
		this.nonLinearContainer = div;

		//Create the img tag that goes inside the container
		var img = document.createElement("img");
		img.style.padding = "0px";
		img.style.margin = "0px";
		img.style.width = "100%";
		img.style.height = "100%";
		img.addEventListener("load", this.handleNonLinearLoad);
		img.addEventListener("error", this.handleNonLinearError);

		this.nonLinearImg = img;

		//Create iframe tag that goes inside the container
		var iframe = document.createElement("iframe");
		iframe.style.padding = "0px";
		iframe.style.margin = "0px";
		iframe.style.width = "100%";
		iframe.style.height = "100%";
		iframe.addEventListener("load", this.handleNonLinearLoad);
		iframe.addEventListener("error", this.handleNonLinearError);
		this.nonLinearIFrame = iframe;

		//Create the close button
		div = document.createElement("div");
		div.className = "iab-visualoverlay-nonlinearui iab-visualoverlay-nonlinearui-closebutton";
		div.addEventListener("click", this.handleNonLinearClose);
		this.nonLinearCloseButton = div;

		this.nonLinearDisplayElement.appendChild(this.nonLinearContainer);
		this.nonLinearDisplayElement.appendChild(this.nonLinearCloseButton);
	};

	//Simulates a click on the NonLinear ad.
	Obj.prototype.simulateNonLinearClick = function() {
		if (this.nonLinearAdID.length > 0) {
		this.handleNonLinearClick();
		}
	};

	//If the NonLinear creative is clicked, fire the acceptInvitation and clickTracking events, and open the iFrame to the clickThrough URL.
	Obj.prototype.handleNonLinearClick = function() {
		webapis.adframework.core.handleAdClick(this.nonLinearAdID, Obj.AdCategory.NONLINEAR_AD);
		//temp save
		this.nonLinearDisplayEndTime = new Date().getTime();
		this.nonLinearDisplayTime = this.nonLinearDisplayTime - (this.nonLinearDisplayEndTime - this.nonLinearDisplayStartTime);
		if(this.nonLinearDisplayTime > 0) {
			this.tempShowNonLinearAd = {
				adbreakID : this.nonLinearAdBreakID ,
				adID : this.nonLinearAdID,
				resourceURL : this.nonLinearResource ,
				resourceType : this.nonLinearResourceType,
				width : this.nonLinearWidth ,
				height : this.nonLinearHeight,
				displayTime : this.nonLinearDisplayTime
			};
			this.hideNonLinearOnClick();
		}
		else{
			this.hideNonLinearAd(true);
		}
	};

	//When the NonLinear close button is clicked, this function is executed. Close the NonLinear creative.
	Obj.prototype.handleNonLinearClose = function() {
		webapis.adframework.VisualOverlay.hideNonLinearAd();
	};

	//Positions the NonLinear display element based on the size and position of the video frame
	Obj.prototype.positionNonLinearAd = function(scaled) {
		if (!this.nonLinearDisplayElement || !scaled) {
			return;
		}
		var lowerX = scaled.x + scaled.w;
		var lowerY = scaled.y + scaled.h;
		var upperX = scaled.x;
		var upperY = scaled.y;

		if (webapis.adframework.config.get("OVERLAY_POSITION") === webapis.adframework.config.OVERLAY_POSITION.BOTTOM_RIGHT) {
			this.nonLinearDisplayElement.style.left = (lowerX - (0 + this.nonLinearDisplayElement.offsetWidth)) + "px";
			this.nonLinearDisplayElement.style.top = (lowerY - (165 + this.nonLinearDisplayElement.offsetHeight)) + "px";
		} else if (webapis.adframework.config.get("OVERLAY_POSITION") === webapis.adframework.config.OVERLAY_POSITION.BOTTOM_LEFT) {
			this.nonLinearDisplayElement.style.left = (upperX) + "px";
			this.nonLinearDisplayElement.style.top = (lowerY - (165 + this.nonLinearDisplayElement.offsetHeight)) + "px";
		} else if (webapis.adframework.config.get("OVERLAY_POSITION") === webapis.adframework.config.OVERLAY_POSITION.TOP_LEFT) {
			this.nonLinearDisplayElement.style.left = (upperX) + "px";
			this.nonLinearDisplayElement.style.top = (upperY+165) + "px";
		} else if (webapis.adframework.config.get("OVERLAY_POSITION") === webapis.adframework.config.OVERLAY_POSITION.TOP_RIGHT) {
			this.nonLinearDisplayElement.style.left = (lowerX - (165 + this.nonLinearDisplayElement.offsetWidth)) + "px";
			this.nonLinearDisplayElement.style.top = (upperY) + "px";
		} else {
			return;
		}
	};

	//Scales the NonLinear display element based on the size of the video frame
	Obj.prototype.scaleNonLinearAd = function(scaled) {
		if (!this.nonLinearDisplayElement || typeof this.nonLinearAdID === "undefined" 
			|| !this.nonLinearAdID.length || typeof this.nonLinearScalable === "undefined" || !this.nonLinearScalable || !scaled) {
			
			return;
		}

		var maxW = scaled.w;
		var maxH = Math.floor(scaled.h * webapis.adframework.config.get("NONLINEAR_MAXIMUM_VIDEO_COVERAGE_RATIO"));
		var minH = Math.floor(scaled.h * webapis.adframework.config.get("NONLINEAR_MINIMUM_VIDEO_COVERAGE_RATIO"));
		var assignedW = this.nonLinearWidth;
		var assignedH = this.nonLinearHeight;
		var aspectRatio = assignedW / assignedH;

		if (assignedW > maxW || assignedH > maxH) {
			//Scale down
			if (assignedW / maxW > assignedH / maxH) {
				//scale using width because it's bigger in ratio to max
				assignedW = maxW;
				assignedH = assignedW / aspectRatio;
			} else {
				//scale using height because it's bigger in ratio to max
				assignedH = maxH;
				assignedW = assignedH * aspectRatio;
			}
		} else if (assignedH < minH) {
			//Scale up
			var scaleRatio = minH / assignedH;
			if ((scaleRatio * assignedW) > maxW) {
				scaleRatio = maxW / assignedW;
			}
			assignedH *= scaleRatio;
			assignedW *= scaleRatio;
		}
		else {
			;/*NULL*/
		}

		this.nonLinearDisplayElement.style.width = assignedW + "px";
		this.nonLinearDisplayElement.style.height = assignedH + "px";
	};

	//Given some HTML, put that HTML into the NonLinear creative.
	//When possible, uses widgetAPI.putInnerHTML in order to avoid memory leaks.
	Obj.prototype.handleNonLinearHTML = function(newHTML) {
		if (this.widgetAPI) {
			widgetAPI.putInnerHTML(this.nonLinearContainer, newHTML);
		} else {
			this.nonLinearContainer.innerHTML = newHTML;
		}
	};

	//Given an imgSrc, display the nonlinear img.
	Obj.prototype.handleNonLinearImg = function(imgSrc) {
		this.nonLinearImg.src = encodeURI(imgSrc);
		this.nonLinearResourceTimeout = setTimeout(this.handleNonLinearTimeout, webapis.adframework.config.get("NONLINEAR_RESOURCE_TIMEOUT"));
		this.nonLinearDisplayElement.appendChild(this.nonLinearImg);
	};

	//Given an imgSrc, display the nonlinear img.
	Obj.prototype.handleNonLinearIFrame = function(iframeSrc) {
		this.nonLinearIFrame.src = encodeURI(iframeSrc);
		this.nonLinearResourceTimeout = setTimeout(this.handleNonLinearTimeout, webapis.adframework.config.get("NONLINEAR_RESOURCE_TIMEOUT"));
		this.nonLinearDisplayElement.appendChild(this.nonLinearIFrame);
	};

	//Given a NonLinear creative, displays the Creative inside the NonLinear display element.
	Obj.prototype.showNonLinearAd = function(params) {

		var parentAdBreakID = params.adbreakID;
		var adID = params.adID;
		var type = params.resourceType;
		var resourceURL = params.resourceURL;
		var displayMS = params.displayTime;
		var self = this;
		
		if (webapis.adframework.config.get("OVERLAY_POSITION") === webapis.adframework.config.OVERLAY_POSITION.DISABLED) {
			webapis.adframework.core.setApplicationError(Obj.AdCategory.NONLINEAR_AD,parentAdBreakID, adID, 500, "NonLinear ads have been disabled in the configuration", resourceURL);
			return false;
		}
		
		if (typeof this.nonLinearAdID !== "undefined" && this.nonLinearAdID && this.nonLinearAdID.length > 0 ) {
			if (this.nonLinearDisplayTimeout || this.vpaidAd) {
				//If we're already displaying a NonLinear ad, abort display
				webapis.adframework.core.setApplicationError(Obj.AdCategory.NONLINEAR_AD,parentAdBreakID, adID, 500, "Rejecting NonLinear ad: A NonLinear ad is already being displayed.",  resourceURL);
				return false;
			} else {
				this.hideNonLinearAd(true);
				webapis.adframework.core.setApplicationError(Obj.AdCategory.NONLINEAR_AD,parentAdBreakID, adID, 500, "Unknown NonLinear error",  resourceURL);
				return false;
			}
		}

		if (this.nonLinearResourceTimeout) {
			clearTimeout(this.nonLinearResourceTimeout);
			this.nonLinearResourceTimeout = null;
		}

		//Check for Flash
		if (type === Obj.NonLinearResource.STATIC_FLASH) {
			webapis.adframework.core.setApplicationError(Obj.AdCategory.NONLINEAR_AD,parentAdBreakID, adID, 503, "Flash resources are not supported",  resourceURL);
			return false;
		}
		//Check for non-vpaid JS
        else if (type === Obj.NonLinearResource.STATIC_JS) {
            webapis.adframework.core.setApplicationError(Obj.AdCategory.NONLINEAR_AD,parentAdBreak, ad, 503, "Non-VPAID JS resources are not supported", resourceURL);
            return false;
        }
		else {
			;/*NULL*/
		}		
		this.nonLinearAdBreakID = parentAdBreakID;
		this.nonLinearAdID = adID;
		this.nonLinearResource = resourceURL;
		this.nonLinearWidth = params.width;
		this.nonLinearHeight = params.height;
		this.nonLinearResourceType = type;
		this.nonLinearDisplayStartTime = new Date().getTime();
		this.nonLinearDisplayTime = displayMS;
        this.nonLinearScalable = params.scalable;

		this.nonLinearDisplayTimeout = setTimeout(function() {
			self.hideNonLinearAd(true);
		}, displayMS);
		if (type === Obj.NonLinearResource.STATIC_IMAGE) {
			this.handleNonLinearImg(resourceURL);
		} else if (type === Obj.NonLinearResource.IFRAME) {
			this.handleNonLinearIFrame(resourceURL);
		} else if (type === Obj.NonLinearResource.HTML) {
			this.handleNonLinearHTML(resourceURL);
				webapis.adframework.core.handleNonLinearTracking(this.nonLinearAdID, "impression");
				webapis.adframework.core.handleNonLinearTracking(this.nonLinearAdID, "creativeView");
		}		
		else {
			;/*NULL*/
		}
		
		//If we have VPAID, don't display the normal nonlinear UI.
        if (type !== Obj.NonLinearResource.STATIC_JS) {
			this.nonLinearDisplayElement.className = "iab-visualoverlay-nonlinearui";
			this.nonLinearDisplayElement.style.width = this.nonLinearWidth + "px";
			this.nonLinearDisplayElement.style.height = this.nonLinearHeight + "px";	

			this.nonLinearContainer.src = resourceURL;
		}
		this.scaleUI();
		webapis.adframework.events.dispatch(webapis.adframework.events.NONLINEAR_AD_START, " ");
		return true;
	};

	//Hides the NonLinear display element (if it's currently showing).
	//If there is not a TRUE passed in as an argument, then it means that the close was triggered by the user. In this case, fire the Close tracking event as well
	Obj.prototype.hideNonLinearAd = function(wasClosedAutomatically) {
			if (wasClosedAutomatically !== true && typeof this.nonLinearAdID !== "undefined" && this.nonLinearAdID && this.nonLinearAdID.length > 0) {
				try {
					webapis.adframework.core.handleNonLinearTracking(this.nonLinearAdID, "close");
				} catch (e) {
					webapis.adframework.core.handleNonLinearTracking(this.nonLinearAdID, "close");			
			}
		}
		if (typeof this.nonLinearAdID !== "undefined" && this.nonLinearAdID && this.nonLinearAdID.length > 0) {
			webapis.adframework.core.handleNonLinearClose(this.nonLinearAdID);
		}
		
		this.nonLinearAdBreakID = "";
		this.nonLinearAdID = "";
		this.nonLinearResource = "";
		this.nonLinearDisplayTime = 0;
		this.tempShowNonLinearAd = null;
		this.nonLinearWidth = 0;
		this.nonLinearHeight = 0;
                this.nonLinearScalable = false;

		if (this.nonLinearDisplayTimeout) {
			clearTimeout(this.nonLinearDisplayTimeout);
			this.nonLinearDisplayTimeout = null;
		}
		if (this.nonLinearResourceTimeout) {
			clearTimeout(this.nonLinearResourceTimeout);
			this.nonLinearResourceTimeout = null;
		}
		
		this.nonLinearImg.src = "";
		this.nonLinearIFrame.src = "";
		this.handleNonLinearHTML("");
		try {
			this.nonLinearDisplayElement.removeChild(this.nonLinearImg);
		} catch (e) {
			;/*NULL*/
		}
		try {
			this.nonLinearDisplayElement.removeChild(this.nonLinearIFrame);
		} catch (e) {
			;/*NULL*/
		}

		this.nonLinearDisplayElement.className = "iab-visualoverlay-nonlinearui iab-visualoverlay-hidden";
	};

	Obj.prototype.hideNonLinearOnClick = function() {
			
		this.nonLinearAdBreakID = "";
		this.nonLinearAdID = "";
		this.nonLinearResource = "";
		if (this.nonLinearDisplayTimeout) {
			clearTimeout(this.nonLinearDisplayTimeout);
			this.nonLinearDisplayTimeout = null;
		}
		if (this.nonLinearResourceTimeout) {
			clearTimeout(this.nonLinearResourceTimeout);
			this.nonLinearResourceTimeout = null;
		}
		
		this.nonLinearImg.src = "";
		this.nonLinearIFrame.src = "";
		this.handleNonLinearHTML("");
		try {
			this.nonLinearDisplayElement.removeChild(this.nonLinearImg);
		} catch (e) {
			;/*NULL*/
		}
		try {
			this.nonLinearDisplayElement.removeChild(this.nonLinearIFrame);
		} catch (e) {
			;/*NULL*/
		}

		this.nonLinearDisplayElement.className = "iab-visualoverlay-nonlinearui iab-visualoverlay-hidden";
	};
	//*********************************************************************************************************	
	
	/**
	* @fn		initSkipUI
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.initSkipUI =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.initSkipUI = function() {
		this.skipUI = document.createElement("span");
		this.skipUI.className = "iab-visualoverlay-skipui";
		
		//Skip Text
		this.skipText = document.createElement("span");
		this.skipUI.appendChild(this.skipText);
		this.skipText.innerText = "SKIP";
		
		//Skip Icons
		this.skipIcons = document.createElement("span");
		this.skipUI.appendChild(this.skipIcons);
		var skipIcon1 = document.createElement("span");
		skipIcon1.className = "iab-visualoverlay-skipui-skipicon";
		this.skipIcons.appendChild(skipIcon1);
		var skipIcon2 = document.createElement("span");
		skipIcon2.className = "iab-visualoverlay-skipui-skipicon";
		this.skipIcons.appendChild(skipIcon2);
		
		document.body.appendChild(this.skipUI);
		this.scaledDimms = {x:0, y:0, w:window.innerWidth, h:window.innerHeight};
		this.skipUI.addEventListener("click", webapis.adframework.core.jumpForward);
		this.skipUI.style.display = "none";
	};
	
	//Given a set of dimensions in 960x540 format (e.g. from the PlayerAdapter), converts them up to true window scale, and then scales all current UI to fit the new dimensions.
	/**
	* @fn		scaleUI
	* @brief	
	*
	* @param[in]/[out]	: evt
	*					: params
	* @return			: Obj.prototype.scaleUI =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.scaleUI = function(evt, params) {
		if(params) {
			this.scaledDimms = this.scaleFrom960(params);
		}
		if(!this.scaledDimms) {
			this.scaledDimms = webapis.adframework.core.getPlayer().getCorrectedDisplayArea();
		}
		
		//Scale Skip area
		if(this.scaledDimms){
			this.positionSkipUI(this.scaledDimms);
		}

		//Scale and reposition all related VisualOverlay components
		this.positionSkipUI(this.scaledDimms);
		this.scaleNonLinearAd(this.scaledDimms);
		this.positionNonLinearAd(this.scaledDimms);
		this.positionLinearClickFrame(this.scaledDimms);
		this.scaleLinearIcons(this.scaledDimms);
		this.positionLinearIcons(this.scaledDimms);
		this.positionVPAID(this.scaledDimms);
        this.scaleVPAID(this.scaledDimms);
	};
	
	//Positions the Skip UI according to the passed-in dimensions.
	/**
	* @fn		positionSkipUI
	* @brief	
	*
	* @param[in]/[out]	: scaled
	* @return			: Obj.prototype.positionSkipUI =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.positionSkipUI = function(scaled) {		
		//Scale Skip area
		if(this.isSkipUIHidden() || !scaled) {
			return; 
		}
		var lowerX = scaled.x + scaled.w;
		var lowerY = scaled.y + scaled.h;
        var upperX = scaled.x;
        var upperY = scaled.y;

        if (webapis.adframework.config.get("OVERLAY_POSITION") === webapis.adframework.config.OVERLAY_POSITION.BOTTOM_RIGHT) {
        this.skipUI.style.left = (lowerX - (5 + this.skipUI.offsetWidth)) + "px";
    	this.skipUI.style.top = (lowerY - (165 + this.skipUI.offsetHeight)) + "px";
        } else if (webapis.adframework.config.get("OVERLAY_POSITION") === webapis.adframework.config.OVERLAY_POSITION.BOTTOM_LEFT) {
            this.skipUI.style.left = (upperX + 5) + "px";
            this.skipUI.style.top = (lowerY - (165 + this.skipUI.offsetHeight)) + "px";
        } else if (webapis.adframework.config.get("OVERLAY_POSITION") === webapis.adframework.config.OVERLAY_POSITION.TOP_LEFT) {
            this.skipUI.style.left = (upperX + 5) + "px";
            this.skipUI.style.top = (upperY + 165) + "px";
        } else if (webapis.adframework.config.get("OVERLAY_POSITION") === webapis.adframework.config.OVERLAY_POSITION.TOP_RIGHT) {
            this.skipUI.style.left = (lowerX - (5 + this.skipUI.offsetWidth)) + "px";
            this.skipUI.style.top = (upperY + 165) + "px";
        } else {
            return;
        }
	};
	
	//Given the ad's playhead, duration, and skip offset (all in MS), show UI for allowing skipping of the ad
	/**
	* @fn		updateSkipUI
	* @brief	
	*
	* @param[in]/[out]	: secondsLeft
	* @return			: Obj.prototype.updateSkipUI =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.updateSkipUI = function(secondsLeft) {
		if(typeof secondsLeft === "number") {
			if(secondsLeft > 0) {
				this.skipText.innerText = secondsLeft;
			}
			else {
				this.skipText.innerText = "SKIP";
			}
		}
		else {
			this.hideSkipUI();
		}
	};
	
	//Check if SkipUI is hidden
	/**
	* @fn		isSkipUIHidden
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.isSkipUIHidden =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.isSkipUIHidden = function() {
		return (this.skipUI.style.display === "none");
	};
	
	//Show SkipUI
	/**
	* @fn		showSkipUI
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.showSkipUI =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.showSkipUI = function() {
		this.skipUI.style.display = "inline";
		this.scaleUI();
	};
	
	//Hide SkipUI
	/**
	* @fn		hideSkipUI
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: Obj.prototype.hideSkipUI =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	Obj.prototype.hideSkipUI = function() {
		this.skipUI.style.display = "none";
	};
	
	return new Obj();
})();

if(typeof window.webapis.adframework !== "object") { 
	window.webapis.adframework = {}; 
}


/**
 * @brief core Model.
 * @details A BluePrint of core Model
 * @return Null
 */
webapis.adframework.core = (function() {
	
	"use strict";
	
	var contentMgr = null;
	
	//Give the player the ID of the SAMSUNG-INFOLINK-PLAYER and SAMSUNG-INFOLINK-AUDIO
	/**
	* @fn		initialize
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: var initialize =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var initialize = function() {
		contentMgr = new webapis.adframework.ContentManager();
		contentMgr.initialize();
	};
	
	//Initialize the player with Content URL and an ad schedule.
	/**
	* @fn		open
	* @brief	
	*
	* @param[in]/[out]	: url
	*					: params
	* @return			: var open =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var open = function(url, params) {
		if( contentMgr ){
			contentMgr.initPlayer(url, params);
		}
	};
	
	//Get reference of player adapeter
	/**
	* @fn		getPlayer
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: var getPlayer =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var getPlayer = function() {
		if( contentMgr ){
			return contentMgr.getPlayer();
		}
		else{
			return null;
		}
	};
	
	
	/**
	* @fn		addPlayerListener
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: var addPlayerListener =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var addPlayerListener = function(key, func) {
		if( contentMgr ){
			contentMgr.getPlayer().addListener(key,func);
		}
	};
	
	//Insert ads based on the specification in params
	/**
	* @fn		insertAdBreak
	* @brief	
	*
	* @param[in]/[out]	: url
	*					: params
	* @return			: var insertAdBreak =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var insertAdBreak = function(url, params) {
		if( contentMgr ){
			contentMgr.insertAdBreak(url, params);
		}
	};
	
	//Start prerolls before playback of main content
	/**
	* @fn		startPrerolls
	* @brief	
	*
	* @param[in]/[out]	: playhead
	* @return			: var startPrerolls =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var startPrerolls = function(playhead) {
		if( contentMgr ){
			contentMgr.startPrerolls(playhead);
		}
	};
	
	/**
	* @fn		setDisplayArea
	* @brief	
	*
	* @param[in]/[out]	: x
	*					: y
	*					: w
	*					: h
	*					: fullscreenMode
	* @return			: var setDisplayArea =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var setDisplayArea = function(x, y, w, h, fullscreenMode, user) {
		if( contentMgr ){
			contentMgr.setDisplayArea(x, y, w, h, fullscreenMode, user);
		}
		
	};
	
	//Stop the current content
	/**
	* @fn		stop
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: var stop =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var stop = function() {
		if( contentMgr ){
			contentMgr.stop();
		}
	};
	
	//Mute/Unmute the current content
	/**
	* @fn		toggleMute
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: var toggleMute =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var toggleMute = function() {
		if( contentMgr ){
			return contentMgr.toggleMute();
		}
		else{
			return false;
		}
	};
	
	
	//Mute/Unmute the current content
	/**
	* @fn		setMute
	* @brief	
	*
	* @param[in]/[out]	: mute
	* @return			: var setMute =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var setMute = function(muteOn) {
		if( contentMgr ){
			return contentMgr.toggleMute(muteOn);
		}
		else{
			return false;
		}
	};
	
	//Pause the current content
	/**
	* @fn		pause
	* @brief	
	*
	* @param[in]/[out]	: isAdClick
	* @return			: var pause =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var pause = function(isAdClick) {
		if( contentMgr ){
			return contentMgr.pause(isAdClick);
		}
		else{
			return false;
		}
	};
	
	//Resume the current content
	/**
	* @fn		resume
	* @brief	
	*
	* @param[in]/[out]	: isAdClick
	* @return			: var resume =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var resume = function(isAdClick) {
		if( contentMgr ){
			return contentMgr.resume(isAdClick);
		}
		else{
			return false;
		}
	};
	
	//Skipping the current content forward
	/**
	* @fn		jumpForward
	* @brief	
	*
	* @param[in]/[out]	: seconds
	* @return			: var jumpForward =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var jumpForward = function(seconds) {
		if( contentMgr ){
			contentMgr.jumpForward(seconds);
		}
	};
	
	//Skipping the current content backward
	/**
	* @fn		jumpBackward
	* @brief	
	*
	* @param[in]/[out]	: seconds
	* @return			: var jumpBackward =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var jumpBackward = function(seconds) {
		if( contentMgr ){
			contentMgr.jumpBackward(seconds);
		}
	};
	
	//Volume up/down
	/**
	* @fn		volumeUp
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: var volumeUp =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var volumeUp = function() {
		var volumeUpKey = 448;
		if( contentMgr ){
			contentMgr.volumeChange(volumeUpKey);
		}
	};
	
	//Volume up/down
	/**
	* @fn		volumeUp
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: var volumeUp =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var volumeDown = function() {
		var volumeDownKey = 447;
		if( contentMgr ){
			contentMgr.volumeChange(volumeDownKey);
		}
	};
	//Get Duration of the content
	/**
	* @fn		getDuration
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: var getDuration =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var getDuration = function() {
		if( contentMgr ){
			return contentMgr.getDuration();
		}
		else{
			return null;
		}
	};
	
	//Application needs to set its screen dimensions
	/**
	* @fn		appConfig
	* @brief	
	*
	* @param[in]/[out]	: param
	* @return			: var appConfig =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var appConfig = function(config){
		if( contentMgr ){
			contentMgr.appConfig(config);
		}
	};
	
	/**
	* @fn		handleCompanionAdViewElementClick
	* @brief	
	*
	* @param[in]/[out]	: priorityCompanionResource
	* @return			: var handleCompanionAdViewElementClick =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var handleCompanionAdViewElementClick = function(priorityCompanionResource){
		if( contentMgr ){
			contentMgr.handleCompanionAdViewElementClick(priorityCompanionResource);
		}
	};
		
	//Get reference of player contentMgr
	/**
	* @fn		getContentManager
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: var getContentManager =
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var getContentManager = function() {
		return contentMgr;
	};
	
	//Handle Tracking events for Non Linear Ads
	/**
	* @fn		handleNonLinearTracking
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var handleNonLinearTracking = function(nonLinearAdID, event) {
		if( contentMgr ){
			contentMgr.handleNonLinearTracking(nonLinearAdID, event);
		}
	};
	
	//Handle Click event for  Ad
	/**
	* @fn		handleAdClick
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var handleAdClick = function(adID, type) {
		if( contentMgr ){
			contentMgr.handleAdClick(adID, type);
		}
	};	

	//Handle close for Non Linear Ad
	/**
	* @fn		handleNonLinearClose
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var handleNonLinearClose = function(nonLinearAdID) {
		if( contentMgr ){
			contentMgr.handleNonLinearClose(nonLinearAdID);
		}
	};
	
	//Error Handling
	/**
	* @fn		setApplicationError
	* @brief	
	*
	* @param[in]/[out]	: void
	* @return			: 
	* @warning			: None
	* @exception		: None
	* @see
	*/
	var setApplicationError = function(type, adBreakID, adID, code, message, adAssetURI) {
		if( contentMgr ){
			contentMgr.setApplicationError(type, adBreakID, adID, code, message, adAssetURI);
		}
	};

    //Adds a function to execute each time before the content starts. The function is passed a reference to the player object that will play content.
	/**
	* @fn		setBeforeContentStartListener
	* @brief	
	*
	* @param[in]/[out]	: func
	* @return			: 
	* @warning			: None
	* @exception		: None
	* @see
	*/	
	var setBeforeContentStartListener = function(func) {
		if( contentMgr ){
			contentMgr.beforeContentStart(func);
		}
    };
	
    //Adds a function to execute each time after the content starts. The function is passed a reference to the player object that will play content.
	/**
	* @fn		setAfterContentStartListener
	* @brief	
	*
	* @param[in]/[out]	: func
	* @return			: 
	* @warning			: None
	* @exception		: None
	* @see
	*/		
    var setAfterContentStartListener = function(func) {
 		if( contentMgr ){
			contentMgr.afterContentStart(func);
		}
    };

    //Adds a function to execute each time before a linear ad starts. The function is passed a reference to the player object that will play content.
	/**
	* @fn		setBeforeLinearAdStartListener
	* @brief	
	*
	* @param[in]/[out]	: func
	* @return			: 
	* @warning			: None
	* @exception		: None
	* @see
	*/		
    var setBeforeLinearAdStartListener = function(func) {
		if( contentMgr ){
			contentMgr.beforeLinearAdStart(func);
		}
    };

    //Adds a function to execute each time after a linear ad starts. The function is passed a reference to the player object that will play content.
	/**
	* @fn		setAfterLinearAdStartListener
	* @brief	
	*
	* @param[in]/[out]	: func
	* @return			: 
	* @warning			: None
	* @exception		: None
	* @see
	*/		
    var setAfterLinearAdStartListener = function(func) {
 		if( contentMgr ){
			contentMgr.afterLinearAdStart(func);
		}
    };

	/**
	* @fn				: setContentPlayheadTime
	* @brief	
	*
	* @param[in]/[out]	: ms
	* @return			: None
	* @warning			: None
	* @exception		: None
	* @see
	*/	
    var setContentPlayheadTime = function(ms) {
 		if( contentMgr ){
			contentMgr.setContentPlayheadTime(ms);
		}
	};
	
	/**
	* @fn				: setOffsetContentPlayheadTime
	* @brief	
	*
	* @param[in]/[out]	: ms
	* @return			: None
	* @warning			: None
	* @exception		: None
	* @see
	*/
    var setOffsetContentPlayheadTime = function(ms) {
 		if( contentMgr ){
			contentMgr.setOffsetContentPlayheadTime(ms);
		}
	};
	/**
	* @fn				: disableAdInsertion
	* @brief	
	*
	* @param[in]/[out]	: allowCurrentAdbreakToFinish
	* @return			: None
	* @warning			: None
	* @exception		: None
	* @see
	*/
    var disableAdInsertion = function(allowCurrentAdbreakToFinish) {
 		if( contentMgr ){
			contentMgr.disableAdInsertion(allowCurrentAdbreakToFinish);
		}
	};
	/**
	* @fn				: enableAdInsertion
	* @brief	
	*
	* @param[in]/[out]	: None
	* @return			: None
	* @warning			: None
	* @exception		: None
	* @see
	*/
    var enableAdInsertion = function() {
 		if( contentMgr ){
			contentMgr.enableAdInsertion();
		}
	};
	/**
	* @fn				: changeContentUrl
	* @brief	
	*
	* @param[in]/[out]	: newURL
	* @return			: None
	* @warning			: None
	* @exception		: None
	* @see
	*/
    var changeContentUrl = function(newURL) {
 		if( contentMgr ){
			contentMgr.changeContentUrl(newURL);
		}
	};
	/**
	* @fn				: setLinearAdUrlModifier
	* @brief	
	*
	* @param[in]/[out]	: func
	* @return			: None
	* @warning			: None
	* @exception		: None
	* @see
	*/
    var setLinearAdUrlModifier = function(func) {
 		if( contentMgr ){
			contentMgr.setLinearAdUrlModifier(func);
		}
		
	};
	var getContentPlayheadPosition = function() {
        if( contentMgr ){
			return contentMgr.getContentPlayheadPosition();
		}
		else{
			return null;
		}	
    };
	var getAdBreakTimes = function() {
         if( contentMgr ){
			return contentMgr.getAdBreakTimes();
		}
		else{
			return null;
		}	
    };
	return {
		//General Functions
		initialize: initialize,
		open: open,
		getPlayer: getPlayer,
		addPlayerListener: addPlayerListener,
		insertAdBreak: insertAdBreak,
		setDisplayArea: setDisplayArea,
		getContentManager : getContentManager,
		
		//Player (playback) functionality
		startPrerolls: startPrerolls,
		stop: stop,
		toggleMute: toggleMute,
		setMute: setMute,
		pause: pause,
		resume: resume,
		jumpForward: jumpForward,
		jumpBackward: jumpBackward,
		volumeUp: volumeUp,
		volumeDown: volumeDown,
        getDuration: getDuration,
		appConfig:appConfig,
		handleCompanionAdViewElementClick: handleCompanionAdViewElementClick,
		handleNonLinearTracking: handleNonLinearTracking,
		handleAdClick: handleAdClick,
		handleNonLinearClose: handleNonLinearClose,
		setApplicationError: setApplicationError,
		setBeforeContentStartListener: setBeforeContentStartListener,
		setAfterContentStartListener: setAfterContentStartListener,
		setBeforeLinearAdStartListener: setBeforeLinearAdStartListener,
		setAfterLinearAdStartListener: setAfterLinearAdStartListener,
		setOffsetContentPlayheadTime: setOffsetContentPlayheadTime,
		setContentPlayheadTime: setContentPlayheadTime,
		disableAdInsertion: disableAdInsertion,
        enableAdInsertion: enableAdInsertion,
		changeContentUrl: changeContentUrl,
        setLinearAdUrlModifier: setLinearAdUrlModifier,
		getContentPlayheadPosition: getContentPlayheadPosition,
		getAdBreakTimes: getAdBreakTimes
	};
}());
