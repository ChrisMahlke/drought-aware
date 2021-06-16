export default function GlobalNavUtils() {

	this.init = (options = {}) => {
		this.initEventHandlers(options);
	};

	this.initEventHandlers = (options) => {
		document.getElementsByClassName('sign-in-btn')[0].addEventListener("click", function () {
			console.log('sign out btn on click');
			if (options.onSignIn) {
				options.onSignIn();
			}
		});

		document.getElementsByClassName('sign-out-btn')[0].addEventListener("click", function () {
			console.log('sign out btn on click');
			if (options.onSignIn) {
				options.onSignOut();
			}
		});
	};

};