<style lang="stylus" scoped>
    $button-width = 200px;
    $button-radius = $button-width/2;

    .container{
        width: 100%;
        height: 100%;
        text-align: center;
        padding: 100px 0 0 0;
        -webkit-user-select: none;
        background: #FFF;
        color: #333;
    }

    .start{
        margin: 50px auto 0 auto;
        color: #333
    }

    .btn1{
        width: $button-width;
        height: $button-width;
        line-height: $button-width;
        border-radius: $button-radius;
        background: radial-gradient(circle at 50% 40%,#fcfcfc,#efeff1 66%,#9b5050 100%);
    }
    .btn1:active{
        background: radial-gradient(circle at 50% 45%,#fcfcfc,#efeff1 66%,#9b5050 100%);
    }

    .btn2{
        width: $button-width;
        height: $button-width;
        line-height: $button-width;
        border-radius: $button-radius;
        margin-top: 50px;
        border: 1px solid #369;
        border-bottom-width: 5px;
    }
    .btn2:active{
        margin-top: 52px;
        border-bottom-width: 2px;
        opacity: .8
    }

    .bar{
        width: 20px;
        height: 100px;
        border: 1px solid #CCC;
        margin: 1em auto;
        border-radius: 5px;
        position: relative;
        background: linear-gradient(to top, blue, red);
    }
    .value{
        width: 100%;
        height: 0%;
        background: #FFF;
    }
    .score{
        position: absolute;
        top: 20px;
        right: 20px;
        z-index: 999
    }
</style>
<template>

    <div class="container" onselectstart="return false">
        <h1 v-if="time <= 1000">{{time}}毫秒</h1>
        <h1 v-if="time > 1000">失败了</h1>
        <div class="start btn2">
            
        </div>
        <p>按住按钮1秒钟</p>
        <div class="score">
            <score name="game2" unit=""></score>
        </div>
    </div>

</template>
<script>
    import Hammer from '../../lib/hammer.js';

    export default {
        data: function(){
            return {
                time: 0,
                timer: null,
                startTime: 0,
                score: 0
            };
        },
        methods: {
            start: function(){
                var self = this;
                self.time = 0;
                self.startTime = new Date().getTime();
                clearInterval(self.timer);
                self.timer = setInterval(function(){
                    self.time = new Date().getTime() - self.startTime;
                }, 10);
            },
            stop: function(){
                clearInterval(this.timer);
                if(this.time <= 1000){
                    this.$broadcast('score', this.time);
                };
                this.timer = null;
            },
            ballStyle: function(){
                if(!this.timer){
                    return 'background-color:#FFF';
                }else{
                    var n = 180 + 180 * (this.time % 1000) * ((this.time % 2000 < 1000) ? 1 : -1) / 1000;
                    return 'background-color:hsl(' + n + ',65%,75%);';
                };
            },
            barStyle: function(){
                var intv = 1000;
                var x = intv - this.time % (2 * intv);
                var n = Math.abs(x / intv * 100);
                n = parseInt(n, 10);
                this.score = this.time % intv;
                return 'height: ' + n + '%';
            }
        },
        ready: function(){

            var btn = this.$el.querySelector('.start');
            var btnHammer = new Hammer(btn);
            var self = this;
            
            // 开始计时
            btnHammer.on('press', self.start.bind(this));

            // 结束计时
            btnHammer.on('pressup ', self.stop.bind(this));
            btn.addEventListener('mousedown', self.stop.bind(this));
            btn.addEventListener('mouseup', self.stop.bind(this));
            btn.addEventListener('touchend', self.stop.bind(this));
            document.addEventListener('touchend', self.stop.bind(this));
        },
        components: {
            'score': require('../../widget/score.vue')
        }
    }
</script>