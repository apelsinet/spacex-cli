const blessed = require('blessed');
const moment = require('moment');
require('es6-promise').polyfill();
require('isomorphic-fetch');
const pjson = require('./package.json');
const screen = blessed.screen({
	smartCSR: true,
});
const APP_TITLE = `SpaceX CLI ${pjson.version}`;
const API_URL = 'https://api.spacexdata.com/v2/launches/upcoming';
const STATUS = {
	FETCHING: 'FETCHING',
	SUCCESS: 'SUCCESS',
	ERROR: 'ERROR',
};
screen.title = APP_TITLE;

class App {
	constructor() {
		this.fetchStatus = null;
		this.data = null;
		this.background = blessed.box({
			top: 'center',
			left: 'center',
			width: '100%',
			height: '100%',
			tags: true,
			style: {
				fg: 'white',
				bg: 'blue',
				hover: {
					bg: 'green',
				},
			},
		});

		this.container = blessed.box({
			parent: this.background,
			label: APP_TITLE,
			top: 'center',
			left: 'center',
			width: '90%',
			height: '90%',
			border: {
				type: 'line',
			},
			style: {
				bg: 'grey',
				fg: 'black',
				border: {
					bg: 'grey',
					fg: 'white',
				},
				label: {
					bg: 'grey',
					fg: 'white',
				},
			},
			shadow: true,
		});

		this.loadingIndicator = blessed.box({
			tags: true,
			parent: this.container,
			content: '\n{center}Fetching...{/center}',
			top: 'center',
			left: 'center',
			height: 3,
			style: {
				bg: 'red',
				fg: 'white',
			},
			hidden: true,
		});

		this.dataContainer = blessed.box({
			tags: true,
			parent: this.container,
			top: 'center',
			left: 'center',
			width: '90%',
			height: '90%',
			padding: 1,
			border: {
				type: 'line',
			},
			style: {
				bg: 'black',
				fg: 'green',
				border: {
					bg: 'grey',
					fg: 'white',
				},
			},
			hidden: true,
		});

		this.content = blessed.box({
			parent: this.dataContainer,
			style: {
				bg: 'black',
				fg: 'green',
			},
		});

		screen.append(this.background);
		screen.key(['escape', 'q', 'C-c'], function(ch, key) {
			return process.exit(0);
		});
		this.background.focus();
		screen.render();
	}

	renderContent() {
		this.loadingIndicator.hide();
		this.dataContainer.hide();
		switch (this.fetchStatus) {
			case STATUS.FETCHING:
				this.loadingIndicator.show();
				break;
			case STATUS.SUCCESS:
				this.updateContent();
				this.dataContainer.show();
				break;
		}
		screen.render();
	}

	getLaunchData() {
		if (!this.fetchStatus) {
			this.fetchStatus = STATUS.FETCHING;
			this.renderContent();
			fetch('https://api.spacexdata.com/v2/launches/upcoming')
				.then(response => {
					if (response.status >= 400) {
						throw new Error('Bad response from server');
					}
					return response.json();
				})
				.then(data => {
					this.data = data;
					this.fetchStatus = STATUS.SUCCESS;
					this.renderContent();
				})
				.catch(err => {
					this.fetchStatus = STATUS.ERROR;
				});
		}
	}

	getLaunchDateFromNow(data) {
		const launchDate = data[0].launch_date_utc;
		return moment(launchDate).fromNow();
	}

	getRandomInt(max) {
		return Math.floor(Math.random() * Math.floor(max));
	}

	updateContent() {
		this.content.setContent(
			this.getNextLaunch() +
				this.getLaunchSite() +
				this.getRocketData() +
				this.getPayloadData(),
		);
	}

	getNextLaunch() {
		return `Next launch ${this.getLaunchDateFromNow(this.data)}.\n`;
	}

	getLaunchSite() {
		const launchSite = this.data[0].launch_site.site_name_long;
		return `Launch site: ${launchSite}\n`;
	}

	getRocketData() {
		const rocketType = this.data[0].rocket.rocket_name;
		const messageUpper = `Rocket: ${rocketType}\n`;
		let messageLower = '';
		const { cores } = this.data[0].rocket.first_stage;
		if (cores.length === 1) {
			messageLower = `1 core, S/N: ${cores[0].core_serial}${
				cores[0].reused
					? ', reused (Flight ' + cores[0].flight + ')'
					: ''
			}\n`;
		} else {
			messageLower = `3 cores, S/N: ${cores[0].core_serial} ${
				cores[1].core_serial
			} ${cores[2].core_serial}\n`;
		}

		return messageUpper + messageLower;
	}

	getPayloadData() {
		const payload = this.data[0].rocket.second_stage.payloads[0];
		const messageUpper = `Payload: ${payload.payload_type}, ID: ${
			payload.payload_id
		}, customer: ${payload.customers[0]}\n`;
		const messageLower = `Orbit: ${payload.orbit}, mass: ${
			payload.payload_mass_kg
		}kg\n`;

		return messageUpper + messageLower;
	}
}

const app = new App();
app.getLaunchData();
