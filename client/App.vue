<script>
	export default {
		// onLaunch: function() {
		// 	console.log('App Launch')
		// },
		// onShow: function() {
		// 	console.log('App Show')
		// },
		// onHide: function() {
		// 	console.log('App Hide')
		// }
		globalData: {
			socketTask: null,
			connect:0,
			loginState:0,
			token:null,
			nickname:null
		},
		onShow(){
			getApp().globalData.socketTask = uni.connectSocket({
				url: 'ws://192.168.3.34:1026',
				complete: () => {}
			})
			getApp().globalData.socketTask.onOpen(() => {
				console.log('connect successfully');
				getApp().globalData.connect = 1;
			})
			getApp().globalData.socketTask.onError(function(){
				uni.showModal({
					showCancel:false,
					content:'connction close'
				})
				getApp().globalData.socketTask.connect = 0;
				getApp().globalData.socketTask.loginState=0;
			})
			getApp().globalData.socketTask.onClose(function(){
				uni.showModal({
					showCancel:false,
					content:'connction close'
				})
				getApp().globalData.socketTask.connect = 0;
				getApp().globalData.socketTask.loginState=0;
			})
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
