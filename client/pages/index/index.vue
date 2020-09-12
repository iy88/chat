<template>
	<view class="content">
		<view id="explain">
			<br>
			<text>Welcome,this a simple and safe chat app</text>
			<br>
			<text v-if="ls">hi~ {{nickname}}</text>
		</view>
		<view id="btn-line"><button type="primary" @click="goLogin">login</button><button type="primary" @click="goRegister">register</button></view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				ls:false,
				nickname:''
			}
		},
		onShow() {
			if (getApp().globalData.loginState) {
				this.nickname = getApp().globalData.nickname;
				uni.setNavigationBarTitle({
					title: 'Private Chat -- ' + getApp().globalData.nickname
				})
				this.ls = true
			} else {
				uni.setNavigationBarTitle({
					title: 'Private Chat'
				})
			}

		},
		methods: {
			goLogin() {
				uni.navigateTo({
					url: '/pages/login/login'
				})
			},
			goRegister() {
				uni.navigateTo({
					url: '/pages/register/register'
				})
			}
		}
	}
</script>

<style>
	#content {
		height: 100vh;
	}

	#explain {
		display: flex;
		align-items: center;
		flex-direction: column;
		width: auto;
		height: auto;
	}

	#btn-line button {
		display: inline-block;
		width: 50vw;
		border-radius: 10px 10px 10px 10px;
	}

	#btn-line {
		position: fixed;
		bottom: 10px;
	}
</style>
