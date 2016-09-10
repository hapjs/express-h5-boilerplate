import Vue from 'vue'

// var panes = [
// 	{
// 		ready: function(el){
// 			new Vue(Object.assign({
// 				el: el,
// 			}, require('./game2.vue')));
// 		}
// 	},
// 	{
// 		ready: function(el){
// 			new Vue(Object.assign({
// 				el: el,
// 			}, require('./game1.vue')));
// 		}
// 	}
// ];

// var vm = new Vue({
//     el: '#body',
//     data: function(){
//     	return {
// 			panes: panes
// 		}
//     },
// 	ready: function(){
// 		var body = document.getElementById('body');
// 		body.style.height = (document.documentElement.clientHeight) + 'px';
// 	},
//     components: {
//         'carousel': require('../../widget/carousel.vue')
//     }
// });