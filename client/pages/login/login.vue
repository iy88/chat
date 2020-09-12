<template>
	<view id="content">
		<view id="form">
			<label><span>account: </span><input type="text" placeholder="account" v-model="account"></label>
			<label><span>password: </span><input type="password" placeholder="password" v-model="password"></label>
			<button type="primary" id="login" @click="login">login</button>
		</view>
	</view>
</template>

<script>
	import md5 from '../../static/lib/md5.js';
	export default {
		data() {
			return {
				account: "",
				password: "",
			}
		},
		onLoad() {
			uni.setNavigationBarTitle({
				title: 'Login'
			})
		},
		onUnload() {
			uni.hideLoading()
		},
		methods: {
			login() {
				if (getApp().globalData.loginState) {
					uni.showModal({
						showCancel: false,
						content: 'already login'
					})
				} else {
					if (getApp().globalData.connect) {
						if (this.account && this.password) {
							uni.showLoading({
								title: 'wait',
								mask: true,
							});
							let account = this.account;
							let password = md5(this.password);
							console.log(account, password)
							getApp().globalData.socketTask.send({
								data: JSON.stringify({
									action: 'auth',
									type:0,
									a: account,
									p: password
								})
							});
							getApp().globalData.socketTask.onMessage(({
								data
							}) => {
								let reply = JSON.parse(data);
								console.log('received: %s', reply);
								if (reply.action === 'auth') { // login
									uni.hideLoading();
									if (reply.code === 1) {
										console.log('auth successfully');
										console.log('nickname: %s\ntoken: %s', reply.data.nickname, reply.data.token);
										getApp().globalData.loginState = 1;
										getApp().globalData.nickname = reply.data.nickname;
										getApp().globalData.token = reply.data.token;
										uni.showModal({
											showCancel: false,
											content: `login successfully: ${getApp().globalData.nickname}`
										})
									} else if (reply.code === 0) {
										console.log('auth fail: error password');
										uni.showModal({
											showCancel: false,
											content: 'error account or password'
										})
									} else if (reply.code === -1000) {
										console.log('server error');
									} else if (reply.code === -1) {
										console.log('already login');
										uni.showModal({
											showCancel: false,
											content: 'already login'
										})
									}
								}
							})
						} else {
							uni.showModal({
								showCancel: false,
								content: 'please complete the form'
							})
						}
					} else {
						uni.showModal({
							showCancel: false,
							content: 'no connection'
						})
					}
				}
			}
		}
	}
</script>

<style>
	#content {
		font-size: calc(10px + 2vmin);
	}

	#form {
		padding: 10px;
	}

	input {
		background-color: #FFFFFF;
		display: block;
		font-size: 20px;
		margin-bottom: 20px;
	}

	span {
		color: #007AFF;
		display: block;
		font-size: 30px;
	}

	button {
		position: relative;
	}
</style>
