const instance_skel = require('../../instance_skel');
const tcp           = require('../../tcp');
const WebSocket     = require('ws');
const actions       = require('./actions');
const presets       = require('./presets');
const ping          = require('ping');
const parseString   = require("xml2js").parseString;
const util          = require("util");
const { executeFeedback, initFeedbacks } = require('./feedbacks');

let debug;
let log;

class instance extends instance_skel {
	/**
	 * Main constructor
	 * @param  {} system
	 * @param  {} id
	 * @param  {} config
	 */
	constructor(system, id, config) {
		super(system, id, config)

		Object.assign(this, {
			...actions,
			...feedbacks,
			...presets
		})

		this.switcher = [];
		this.inputs = [];
		this.system_macros = [];
		this.tally = [];
		this.tallyPGM = [];
		this.tallyPVW = [];
		this.shortcut_states = [];
		this.mediaTargets = [];
		this.meDestinations = [];
		this.createMediaTargets();
		this.createMeDestinations();
	}
	
	createMeDestinations() {
		for (let index = 1; index < 9; index++) {
			this.meDestinations.push({id: `v${index}_a_row`, label: `v${index} a bus`})
			this.meDestinations.push({id: `v${index}_b_row`, label: `v${index} b bus`})
		}
	}
	/**
	 * Creating of media targets
	 */
	createMediaTargets() {
		for (let index = 1; index < 5; index++) {
			this.mediaTargets.push({id: `ddr${index}_play`, label:`ddr${index} Play`})
			this.mediaTargets.push({id: `ddr${index}_play_toggle`, label:`ddr${index} Play Toggle`})
			this.mediaTargets.push({id: `ddr${index}_stop`, label:`ddr${index} Stop`})
			this.mediaTargets.push({id: `ddr${index}_back`, label:`ddr${index} Back`})
			this.mediaTargets.push({id: `ddr${index}_forward`, label:`ddr${index} Forward`})
		}
		for (let index = 1; index < 3; index++) {
			this.mediaTargets.push({id: `gfx${index}_play`, label:`gfx${index} Play`})
			this.mediaTargets.push({id: `gfx${index}_play_toggle`, label:`gfx${index} Play Toggle`})
			this.mediaTargets.push({id: `gfx${index}_stop`, label:`gfx${index} Stop`})
			this.mediaTargets.push({id: `gfx${index}_back`, label:`gfx${index} Back`})
			this.mediaTargets.push({id: `gfx${index}_forward`, label:`gfx${index} Forward`})
		}
		this.mediaTargets.push({id: `stills_play`, label:`stills Play`})
		this.mediaTargets.push({id: `stills_play_toggle`, label:`stills Play Toggle`})
		this.mediaTargets.push({id: `stills_stop`, label:`stills Stop`})
		this.mediaTargets.push({id: `stills_back`, label:`stills Back`})
		this.mediaTargets.push({id: `stills_forward`, label:`stills Forward`})
		
		this.mediaTargets.push({id: `titles_play`, label:`titles Play`})
		this.mediaTargets.push({id: `titles_play_toggle`, label:`titles Play Toggle`})
		this.mediaTargets.push({id: `titles_stop`, label:`titles Stop`})
		this.mediaTargets.push({id: `titles_back`, label:`titles Back`})
		this.mediaTargets.push({id: `titles_forward`, label:`titles Forward`})
	}
	/**
	 * The main config fields for user input like IP address
	 */
	config_fields() {
		return [
			{
				type:  'text',
				id:    'info',
				width:  12,
				label: 'Information',
				value: 'This module connects to a Tricaster.'
			},
			{
				type:  'textinput',
				id:    'host',
				label: 'Target IP',
				width:  6,
				regex:  this.REGEX_IP
			}
		]
	}

	/**
	 * Set all the actions
	 * @param  {} system
	 */
	actions(system) {
		this.setActions(this.getActions());
	}

	sort(array) {
		array((a, b) => b - a);
	}

	/**
	 * Handle stuff when modules gets destroyed
	 */
	destroy() {
		debug("destroy", this.id);
		this.active = false;
	}

	/**
	 * Start of the module
	 */
	init() {
		debug = this.debug;
		log = this.log;
		this.active = true;

		this.status(this.STATUS_UNKNOWN);

		this.init_variables();
		this.connections();
	}
	
	connections() {
		// Settings must be made first
		if(this.config.host !== undefined) {
			var cfg = {
				timeout: 4,
			};
			ping.sys.probe(this.config.host, (isAlive) => {
				if(isAlive) {
					// Get all initial info needed
					this.sendGetRequest(`http://${this.config.host}/v1/version`); // Fetch mixer info
					this.sendGetRequest(`http://${this.config.host}/v1/dictionary?key=tally`) // Fetch initial input info
					this.sendGetRequest(`http://${this.config.host}/v1/dictionary?key=macros_list`) // Fetch macros
					this.init_TCP();
					// this.sendGetRequest(`http://${this.config.host}/v1/dictionary?key=switcher`) // Fetch switcher info including tally
					// this.sendGetRequest(`http://${this.config.host}/v1/dictionary?key=shortcut_states`) // Fetch states of players etc
					this.init_feedbacks();
					this.init_presets();
					this.status(this.STATE_OK);
				} else {
					this.status(this.STATE_ERROR, 'No ping reply from ' + this.config.host);
					this.log('error', "Network error: cannot reach IP address");
				}
			}, cfg);
		} else {
			this.status(this.STATE_ERROR, 'Invalid IP configured');
		}
	}
	/**
	 * Called when config has been updated
	 * @param  {} config
	 */
	updateConfig(config) {
		this.config = config
		this.status(this.STATUS_UNKNOWN);

		this.init_variables();
		this.init_feedbacks();
		
		
		// Get all initial info needed
		this.sendGetRequest(`http://${this.config.host}/v1/version`); // Fetch mixer info
		this.sendGetRequest(`http://${this.config.host}/v1/dictionary?key=tally`) // Fetch initial input info
		this.sendGetRequest(`http://${this.config.host}/v1/dictionary?key=macros_list`) // Fetch macros

		this.init_TCP();
		// this.sendGetRequest(`http://${this.config.host}/v1/dictionary?key=switcher`) // Fetch switcher info including tally
		// this.sendGetRequest(`http://${this.config.host}/v1/dictionary?key=shortcut_states`) // Fetch states of players etc
		
		this.init_presets();
	}

	/**
	 * Set the TCP connection to send shortcuts to the mixer, should be the fastest option
	*/
	init_TCP () {
		this.config.port = 5951; // Fixed port
		this.inputBuffer = Buffer.from("");

		if (this.config.host !== undefined) {
			if (this.socket !== undefined) {
				this.socket.destroy();
				delete this.socket;
			}

			this.status(this.STATE_WARNING, 'Connecting');
			if (this.config.host) {
				this.socket = new tcp(this.config.host, this.config.port);

				this.socket.on('status_change', (status, message) => {
					this.status(status, message); // Update status when something happens
				});

				this.socket.on('error', (err) => {
					debug("Network error", err);
					this.status(this.STATE_ERROR, err);
					this.log('error', "Network error: " + err.message);
				});

				this.socket.on('connect', () => {
					this.status(this.STATE_OK);
					// Ask the mixer to give us variable (register/state) updates on connect
					this.socket.send(`<register name="NTK_states"/>\n`);

					debug("TriCaster shortcut socket Opened");
					// this.init_websocket_listener();
				});

				this.socket.on('data', (inputData) => {
					clearTimeout(this.errorTimer);

					this.inputBuffer = Buffer.concat([this.inputBuffer, inputData]);
		
					parseString(
						Buffer.from("<root>" + this.inputBuffer.toString() + "</root>"),
						(err, result) => {
							if (!err) {
								this.inputBuffer = Buffer.from("");
								this.incomingData(result.root);
							} else {
								this.errorTimer = setTimeout(() => {
									throw "Timeout getting a complete xml packet";
								}, 500);
							}
						}
					);
				});
			}
		}
	}
	
	/**
	 * @param  {} states
	 */
	shortcutStatesIngest(states) {
		states.forEach(element => {
			if(element['$']['name'] == 'preview_tally') {
				this.tallyPVW.length = [];
				this.setVariable('pvw_source', element['$']['value'].toLowerCase().split("|"));
				element['$']['value'].toLowerCase().split("|").forEach(element2 => {
					const index = this.inputs.findIndex((el) => el.name == element2.toLowerCase())
					this.tallyPVW[this.inputs[index].id] = true;
				});
				this.checkFeedbacks['Tally_PVW']
			} else if(element['$']['name'] == 'program_tally') {
				this.setVariable('pgm_source', element['$']['value'].toLowerCase().split("|"));
				this.tallyPGM.length = [];
				element['$']['value'].toLowerCase().split("|").forEach(element2 => {
					const index = this.inputs.findIndex((el) => el.name == element2.toLowerCase())
					this.tallyPGM[this.inputs[index].id] = true;
				});
				this.checkFeedbacks['Tally_PGM']
			} else if(element['$']['name'].match(/_short_name/)) {
				const index = this.inputs.findIndex((el) => el.name == element['$']['name'].slice(0, -11));
				if(index != -1) {
					this.inputs[index].short_name = element['$']['value'];
				} 
				const va_index = this.meDestinations.findIndex((el) => el.label.slice(0, -6) == element['$']['name'].slice(0, -11));
				if(va_index != -1) {
					this.meDestinations[va_index].label = element['$']['value'] + " a bus";
				} 
				const vb_index = this.meDestinations.findIndex((el) => el.label.slice(0, -6) == element['$']['name'].slice(0, -11));
				if(vb_index != -1) {
					this.meDestinations[vb_index].label = element['$']['value'] + " b bus";
				} 
			} else if(element['$']['name'].match(/_long_name/)) {
				const index = this.inputs.findIndex((el) => el.name == element['$']['name'].slice(0, -10) );
				if(index != -1) {
					this.inputs[index].long_name = element['$']['value'];
					this.inputs[index].label = element['$']['value'];
				} 
			} else if(element['$']['name'].match(/record_toggle/)) {
				this.switcher['recording'] = element['$']['value'] == '1' ? true : false;
				this.setVariable('recording', element['$']['value'] == '1' ? true : false);
				this.checkFeedbacks['tally_record'];
			} else if(element['$']['name'].match(/streaming_toggle/)) {
				this.switcher['streaming'] = element['$']['value'] == '1' ? true : false;
				this.setVariable('streaming', element['$']['value'] == '1' ? true : false);
				this.checkFeedbacks['tally_streaming'];
			} else if(element['$']['name'].match(/ddr1_play/) || element['$']['name'].match(/ddr2_play/) || element['$']['name'].match(/ddr3_play/) || element['$']['name'].match(/ddr4_play/)) {
				this.shortcut_states[element['$']['name']] == element['$']['value'];
				this.checkFeedbacks['play_media'];
			}
		});
		console.log('ME',this.meDestinations);
	}
	/**
	 * @param  {} data
	 */
	incomingData(data) {
    if (data.shortcut_states !== undefined) {
      if (Array.isArray(data.shortcut_states)) {
        data.shortcut_states.forEach((states) =>
          this.shortcutStatesIngest(states.shortcut_state)
        );
      } else {
        this.shortcutStatesIngest(data.shortcut_states.shortcut_state);
      }
			this.actions();
			this.init_presets();
    } else {
      console.log(
        "UNKNOWN INCOMING DATA",
        util.inspect(data, false, null, true)
      );
    }
  }

	/**
	 * Initialize presets
	 * @param  {} updates
	 */
	init_presets(updates) {
		this.setPresetDefinitions(this.getPresets());
	}

	/**
	 * Send a REST GET request to the switcher and handle errorcodes
	 * @param  {} url
	 */
	sendGetRequest(url) {
		debug('Requesting the following url:', url);
		this.system.emit('rest_get', url, (err, result) => {
			if (err !== null) {
				this.status(this.STATUS_ERROR, result.error.code);
				this.log('error', 'Connection failed (' + result.error.code + ')');
				this.retryConnection();     
			}
			else {
				if (result.response.statusCode == 200) {
					this.status(this.STATUS_OK);
					this.processData(result.data);
				} else if (result.response.statusCode == 401) {     // mmm password?
					this.status(this.STATUS_ERROR, "Password needed?");
					this.log('error', "Password? HTTP status code: " + result.response.statusCode);
				} else {
					this.status(this.STATUS_ERROR, "Unespected HTTP status code: " + result.response.statusCode);
					this.log('error', "Unespected HTTP status code: " + result.response.statusCode);
				}
			}
		});
	}
	
	/**
	 * Process incoming data from the websocket connection
	 * @param  {} data
	 */
	processData(data) {
		if(data['tally'] !== undefined ) { // Set PGM and PVW variable/Feedback
			if (this.inputs.length == 0) {
				console.log('Load initial Data');
				data['tally']['column'].forEach(element => {
					this.inputs.push({'id': element['$']['index'], 'label': element['$']['name'], 'name': element['$']['name'], 'long_name': element['$']['name'], 'short_name': element['$']['name'] })
				});
			}
		} else if (data['product_information'] !== undefined) {
			this.log('info', `Connected to: ${data['product_information']['product_name']} at ${this.config.host}`);
			this.switcher['product_name'] = data['product_information']['product_name'];
			this.switcher['product_version'] = data['product_information']['product_version'];

			this.setVariable('product_name', data['product_information']['product_name'])
			this.setVariable('product_version', data['product_information']['product_version'])
		} else if (data['switcher_update'] !== undefined) {
			// Update list with names
			let counter = 0;
			data['switcher_update']['inputs']['physical_input'].forEach(element => {
				this.inputs[counter]['label'] = element['$']['button_label'];
				counter++;
			});
			this.actions(); // Set the actions after info is retrieved
			this.init_feedbacks(); // Same for feedback as it holds the inputs
			this.init_presets();
			this.checkFeedbacks('tally_PGM'); // Check directly, which source is active
			this.checkFeedbacks('tally_PVW'); // Check directly, which source is on preview
		} else if (data['macros'] !== undefined) {
			// Fetch all macros
			data['macros']['systemfolder']['macro'].forEach(element => {
				this.system_macros.push({ 'id': element['$']['identifier'], 'label': element['$']['name'] })
			});
			this.actions(); // Reset the actions, marco's could be updated
		} if(data['shortcut_states'] !== undefined) {
			// this.shortcut_states.length = [];
			// // Filter shortcut states and wait for it to finish before processing feedback
			// let promise = new Promise((resolve, reject) =>{
			// 	data['shortcut_states']['shortcut_state'].forEach(element => {
			// 		let name = element['$']['name'];
			// 		if(name == 'ddr1_play' || name == 'ddr2_play' || name == 'ddr3_play' || name == 'ddr4_play') {
			// 			this.shortcut_states[name] = element['$']['value'];
			// 		}
			// 	})
			// 	resolve();
			// })
	
			// promise.then(() => {
			// 	this.checkFeedbacks('play_media');
			// })
		}
	}
	
	/**
	 * Set variable definitions
	 */
	init_variables() {
		var variables = [
			{ name: 'product_name', label: 'Product name' },
			{ name: 'product_version', label: 'Product version' },
			{ name: 'pgm_source', label: 'Source on Program' },
			{ name: 'pvw_source', label: 'Source on Preview' },
			{ name: 'recording', label: 'Recording' },
			{ name: 'streaming', label: 'Streaming' },
		]
		this.setVariableDefinitions(variables)
	}

	/**
	 * Set available feedback choices
	 */
	init_feedbacks() {
		const feedbacks = initFeedbacks.bind(this)();
		this.setFeedbackDefinitions(feedbacks);
	}

	/**
	 * Execute feedback
	 * @param  {} feedback
	 * @param  {} bank
	 */
	feedback(feedback, bank) {
		return executeFeedback.bind(this)(feedback, bank);
	}
	
	/**
	 * Create a WebSocket connection for retrieving updates
	 */
	init_websocket_listener() {
		const url = 'ws://' + this.config.host + '/v1/change_notifications';
		const ws = new WebSocket(url);

		ws.on('open', () => {
			// ping server every 15 seconds to keep connection open
			const interval = setInterval(function () {
				// readyState 1 = OPEN
				if (ws.readyState == 1) {
					ws.send('keep alive');
				}
				// readyState 2 = CLOSING, readyState 3 = CLOSED
				else if (ws.readyState == 2 || ws.readyState == 3) {
					clearInterval(interval);
				}
			}, 15000);

			console.log("TriCaster Listener WebSocket Opened");
		});

		ws.on('message', (msg) => {
			if (msg.search('tally') != '-1') {
				this.sendGetRequest(`http://${this.config.host}/v1/dictionary?key=tally`) // Fetch initial tally info
			} 
			if (msg.search('switcher') != '-1') {
				this.sendGetRequest(`http://${this.config.host}/v1/dictionary?key=switcher`) // Fetch switcher info
			} 
			if (msg.search('shortcut_states') != '-1') {
				this.sendGetRequest(`http://${this.config.host}/v1/dictionary?key=shortcut_states`) // Fetch shotcut info
			}	else {
				debug(msg);
			}
		});

		ws.on('onclose', () => {
			console.log('Strange, socket is closed');
		});

		ws.on('onerror', (msg) => {
			console.log('Error', msg.data);
		})
	}

		/**
	 * Process all executed actions (by user)
	 * @param  {} action
	 */
	action(action) {
		let id  = action.action;
		let opt = action.options;
		let cmd = '';

		switch (id) {
			case 'take':
				cmd = `<shortcuts><shortcut name="main_background_take" /></shortcuts>`;
				break;
			case 'auto':
				cmd = `<shortcuts><shortcut name="main_background_auto" /></shortcuts>`;
				break;
			case 'macros':
				cmd = `<shortcuts><shortcut name="play_macro_byid" value="${opt.macro}" /></shortcuts>`;
				break;
			case 'source_pgm':
				cmd = `<shortcuts><shortcut name="main_a_row" value="${opt.source}" /></shortcuts>`;
				this.tallyPGM = opt.source; // Do we wait for feedback or set it directly?
				break;
			case 'source_pvw':
				cmd = `<shortcuts><shortcut name="main_b_row" value="${opt.source}" /></shortcuts>`;
				this.tallyPVW = opt.source; // Do we wait for feedback or set it directly?
				break;
			case 'source_to_v':
				cmd = `<shortcuts><shortcut name="${opt.destination}" value="${opt.source}" /></shortcuts>`;
				break;
			case 'media_target':
				cmd = `<shortcuts><shortcut name="${opt.target}" /></shortcuts>`;
				break;
			case 'record_start':
				cmd = `<shortcuts><shortcut name="record_start" /></shortcuts>`;
				break;
			case 'record_stop':
				cmd = `<shortcuts><shortcut name="record_stop" /></shortcuts>`;
				break;
			case 'tbar':
				cmd = `<shortcuts><shortcut name="main_value" /></shortcuts>`;
				break;
			case 'custom':
				cmd = opt.custom;
				break;
		}

		if (cmd !== '') {
			// send the xml to TCP socket
			this.socket.send(cmd + '\n');
			console.log(cmd);
		} else {
			// mmm do matching action found?
		}
		this.checkFeedbacks('tally_PGM');
		this.checkFeedbacks('tally_PVW');
	}
}

exports = module.exports = instance;
