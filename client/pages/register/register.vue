<template>
	<view id="content">
		<view id="form">
			<label><span>account: </span><input type="text" placeholder="account"></label>
			<label><span>password: </span><input type="password" placeholder="password"></label>
			<label><span>confrim: </span><input type="password" placeholder="password"></label>
			<button type="primary" id="login">register</button>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
			}
		},
		onLoad() {
			uni.setNavigationBarTitle({
				title: 'Register'
			})
		},
		methods: {

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
