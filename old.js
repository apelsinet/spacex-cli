const vorpal = require('vorpal')();
require('es6-promise').polyfill();
require('isomorphic-fetch');
const moment = require('moment');
const window = require('window-size');
const API_URL = 'https://api.spacexdata.com/v2/launches/upcoming';
const STATUS = {
	FETCHING: 'FETCHING',
	SUCCESS: 'SUCCESS',
	ERROR: 'ERROR',
};

class RenderUi {
	constructor() {
		this.fetchStatus = null;
		this.data = null;
		this.interval = null;
	}

	getLaunchData() {
		if (!this.fetchStatus) {
			this.fetchStatus = STATUS.FETCHING;
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

	draw() {
		this.getLaunchData();
		this.interval = setInterval(() => {
			vorpal.ui.redraw(this.ui());
		}, 100);
	}

	renderLineTop() {
		return `╔${'═'.repeat(window.width - 2)}╗\n`;
	}

	renderLineMiddle() {
		return `╠${'═'.repeat(window.width - 2)}╣\n`;
	}

	renderLineBottom() {
		return `╚${'═'.repeat(window.width - 2)}╝\n`;
	}

	renderRow(message) {
		return `║${message}${' '.repeat(window.width - 2 - message.length)}║\n`;
	}

	renderHeader() {
		let message = '';
		switch (this.fetchStatus) {
			case STATUS.FETCHING:
				message = `Fetching${'.'.repeat(this.getRandomInt(5))}`;
				break;
			case STATUS.SUCCESS:
				message = `Next launch ${this.getLaunchDateFromNow(
					this.data,
				)}.`;
				break;
			case STATUS.ERROR:
				message = 'Could not connect to SpaceX API';
				break;
		}

		return this.renderLineTop() + this.renderRow(message);
	}

	renderLaunchSite() {
		if (!this.data) {
			return this.renderRow('');
		}
		const launchSite = this.data[0].launch_site.site_name_long;
		const message = `Launch site: ${launchSite}`;
		return this.renderRow(message);
	}

	renderAnimation() {
		const timeFactor = parseInt(moment().format('s'), 10) / 60;
		const smokeLength = (window.width - 6) * timeFactor;
		const message = `${'~'.repeat(smokeLength)}▶▭▭▸`;
		return this.renderRow(message);
	}

	renderRocketData() {
		if (!this.data) {
			return this.renderRow('');
		}
		const rocketType = this.data[0].rocket.rocket_name;
		const messageUpper = `Rocket: ${rocketType}`;
		let messageLower = '';
		const { cores } = this.data[0].rocket.first_stage;
		if (cores.length === 1) {
			messageLower = `1 core, S/N: ${cores[0].core_serial}${
				cores[0].reused
					? ', reused (Flight ' + cores[0].flight + ')'
					: ''
			}`;
		} else {
			messageLower = `3 cores, S/N: ${cores[0].core_serial} ${
				cores[1].core_serial
			} ${cores[2].core_serial}`;
		}

		return this.renderRow(messageUpper) + this.renderRow(messageLower);
	}

	renderPayloadData() {
		if (!this.data) {
			return this.renderRow('');
		}
		const payload = this.data[0].rocket.second_stage.payloads[0];
		return (
			this.renderRow(
				`Payload: ${payload.payload_type}, ID: ${
					payload.payload_id
				}, customer: ${payload.customers[0]}`,
			) +
			this.renderRow(
				`Orbit: ${payload.orbit}, mass: ${payload.payload_mass_kg}kg`,
			)
		);
	}

	ui() {
		return (
			this.renderHeader() +
			this.renderLaunchSite() +
			this.renderAnimation() +
			this.renderRocketData() +
			this.renderLineMiddle() +
			this.renderPayloadData() +
			this.renderLineBottom()
		);
	}
}

const space = new RenderUi();
space.draw();
