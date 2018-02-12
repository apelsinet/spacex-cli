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
		this.data = [];
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

		return (
			this.renderLineTop() +
			this.renderRow(message) +
			this.renderLineMiddle()
		);
	}

	renderRocket() {
        const timeFactor = parseInt(moment().format('s'), 10) / 60;
        const smokeLength = (window.width - 6) * timeFactor;
		const message = `${'~'.repeat(smokeLength)}▶▭▭▸`;
		return this.renderRow(message);
	}

	ui() {
		return this.renderHeader() + this.renderRocket();
	}
}

const space = new RenderUi();
space.draw();

vorpal.command('fetch', 'Fetches new data').action(function(args, callback) {
	space.getLaunchData();
	callback();
});

// vorpal.delimiter('$').show();
