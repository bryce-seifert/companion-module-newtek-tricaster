module.exports = {
	getActions() {
		var actions = {}

		actions['take'] = { label: 'Take' }
		actions['auto'] = { label: 'Auto transition' }
		actions['auto_dsk'] = {
			label: 'Auto transition DSK',
			options: [
				{
					label: 'Choose dsk',
					type: 'dropdown',
					choices: [
						{ id: 'dsk1', label: 'dsk 1' },
						{ id: 'dsk2', label: 'dsk 2' },
						{ id: 'dsk3', label: 'dsk 3' },
						{ id: 'dsk4', label: 'dsk 4' },
					],
					id: 'dsk',
					default: 'dsk1',
				},
			],
		}
		actions['record_start'] = { label: 'Record Start' }
		actions['record_stop'] = { label: 'Record Stop' }
		actions['streaming'] = {
			label: 'Streaming',
			options: [
				{
					label: 'on/off',
					id: 'force',
					type: 'dropdown',
					choices: [
						{ id: 1, label: 'on' },
						{ id: 0, label: 'off' },
					],
					default: 1,
				},
			],
		}

		actions['trigger'] = {
			label: 'Trigger Marco',
			options: [
				{
					label: 'trigger',
					type: 'textinput',
					id: 'macro',
					default: '',
				},
			],
		}

		actions['macros'] = {
			label: 'Run system macro',
			options: [
				{
					label: 'Select macro',
					type: 'dropdown',
					id: 'macro',
					choices: this.system_macros,
					default: 'Stream: Start',
				},
			],
		}

		actions['source_pvw'] = {
			label: 'Set source to preview',
			options: [
				{
					label: 'Sources',
					type: 'dropdown',
					id: 'source',
					choices: this.inputs,
					default: 0,
				},
			],
		}

		actions['source_pgm'] = {
			label: 'Set source to program',
			options: [
				{
					label: 'Sources',
					type: 'dropdown',
					id: 'source',
					choices: this.inputs,
					default: 0,
				},
			],
		}

		actions['source_to_v'] = {
			label: 'Set source to V',
			options: [
				{
					label: 'Destination',
					type: 'dropdown',
					id: 'destination',
					choices: this.meDestinations,
					default: 'v1_a_row',
				},
				{
					label: 'Sources',
					type: 'dropdown',
					id: 'source',
					choices: this.inputs,
					default: 0,
				},
			],
		}

		actions['source_to_dsk'] = {
			label: 'Set source to dsk',
			options: [
				{
					label: 'Destination',
					type: 'dropdown',
					id: 'destination',
					choices: this.dskDestinations,
					default: 'v1_dsk1',
				},
				{
					label: 'Sources',
					type: 'dropdown',
					id: 'source',
					choices: this.inputs,
					default: 0,
				},
			],
		}

		// actions['tbar'] = {
		// 	label: 'Set t-bar to position',
		// 	options: [{
		// 		label: 'Position',
		// 		type: 'number',
		// 		id: 'position',
		// 		min: 0,
		// 		max: 255,
		// 		default: 0
		// 	}]
		// }

		actions['media_target'] = {
			label: 'Media options',
			options: [
				{
					label: 'Target',
					type: 'dropdown',
					id: 'target',
					choices: this.mediaTargets,
					default: 'ddr1_play',
				},
			],
		}

		actions['datalink'] = {
			label: 'Set datalink key value',
			options: [
				{
					label: 'Datalink Key',
					type: 'textinput',
					id: 'datalink_key',
					width: 6,
				},
				{
					label: 'Datalink Value',
					type: 'textinput',
					id: 'datalink_value',
					width: 6,
				},
			],
		}

		actions['custom'] = {
			label: 'Custom shortcut',
			options: [
				{
					label: 'Command',
					type: 'textinput',
					id: 'custom',
					default: '<shortcuts><shortcut name="main_background_take" /></shortcuts>',
				},
			],
		}

		return actions
	},
}
