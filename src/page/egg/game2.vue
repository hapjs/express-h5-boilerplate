itemIndex<style lang="stylus" scoped>
    $button-width = 200px;
    $button-radius = $button-width/2;

    .container{
        width: 100%;
        height: 100%;
        text-align: center;
        padding: 5px 0 0 0;
        -webkit-user-select: none;
        background: #FFF;
        color: #333;
        position: relative
    }

    .start{
        margin: 50px auto 0 auto;
        color: #333;
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
        line-height: 60px;
        border-radius: 5px;
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
        width: 10px;
        height: 200px;
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
        top: 50px;
        right: 20px;
    }
    b{
        color: #393;
        display: inline-block;
        padding: 0 2px
    }
    .surplus{
        position: absolute;
        right: 20px;
        top: 20px;
        font-size: .8em;
    }
    .red{
        color: red
    }
</style>
<template>

    <div class="container" onselectstart="return false">
        <p>难度系数：{{max}}<sup>{{pow}}</sup></p>
        <div class="bar">
            <div class="value" :style="barStyle()"></div>
            <span class="score"></span>
        </div>
        <p>按下按钮开始蓄力，松开按钮扔鸡蛋</p>
        <p style="height: 2em; opacity: {{!timer ? '1' : '0'}}">
            <span v-if="score >= 80">
                <span v-if="score > 90">
                    太厉害了，
                </span>
                你{{hit(score)}}了<b>{{user}}</b>
            </span>
            <span v-if="score < 80 && score >= 20">你谁也没有砸到</span>
            <span v-if="score < 20 && score >= 10">你砸到了自己</span>
        </p>
        <div class="start btn2">
            {{timer ? '蓄力中' : '按住'}} 
        </div>
        <div class="score">
            <score name="game1" unit="分"></score>
        </div>
        <div class="surplus">
            剩余鸡蛋: <span class="red">{{surplus}}</span>个
        </div>
    </div>

</template>
<script>
    import Hammer from '../../lib/hammer.js';

    // 加速度
    var accelerated = function(n){
        var max = this.max;
        var pow = this.pow; 
        n = max * n / 100;
        n = 100 * Math.pow(n, pow) / Math.pow(max, pow);
        return n;
    };
    
    var users = [
        '金来',
        '潇宏',
        '孟爷',
        '海平',
        '罗芬',
        '博言',
        '拱拱',
        '小兰',
        '杨潇',
        '郑凯',
        '宝贝'
    ];

    export default {
        data: function(){
            return {
                time: 0,
                timer: null,
                startTime: 0,
                score: 0,
                max: 10,
                pow: 6, 
                user: '',
                surplus: 9999
            };
        },
        methods: {
            start: function(){
                var self = this;
                if(!this.surplus){
                    alert('你的鸡蛋用完了哟，不过看你骨骼惊奇，就送你100个吧');
                    this.surplus = 100;
                    return;   
                };
                self.time = 0;
                self.startTime = new Date().getTime();
                clearInterval(self.timer);
                self.timer = setInterval(function(){
                    self.time = new Date().getTime() - self.startTime;
                }, 10);
            },
            stop: function(){
                var self = this;

                if(!this.surplus || !this.timer) return;

                //
                if(this.score >= 99){
                    this.user = '光总';
                }else if(this.score >= 90){
                    this.selectUser(['光总'].concat(users));
                }else{
                    this.selectUser();
                };

                this.surplus -= 1;

                clearInterval(this.timer);
                this.$broadcast('score', this.score);
                // if(this.score > 30){
                //     //alert('英雄，这枚鸡蛋托付给你了');
                // };
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
                var x = intv - (this.time + intv) % (2 * intv);
                var n = Math.abs(x / intv * 100);
                n = parseInt(n, 10);

                n = accelerated.call(this, n);
                
                this.score = n;

                return 'height: ' + (100-n) + '%';
            },
            selectUser: function(list){
                list = list || users;
                this.user = list[parseInt(Math.random()*users.length, 10)];
            },
            hit: function(n){
                if(n >= 99){
                    return '砸晕';
                }else if(n >= 95){
                    return '砸哭';
                }else{
                    return '砸到';
                };
            }
        },
        ready: function(){

            var btn = this.$el.querySelector('.start');
            var btnHammer = new Hammer(btn);
            var self = this;
            
            // 开始计时
            btnHammer.on('press', self.start.bind(this));

            // 结束计时
            document.addEventListener('mouseup', self.stop.bind(this));
            document.addEventListener('touchend', self.stop.bind(this));
            window.ontouchstart = function(e) { 
                e.preventDefault(); 
            };
        },
        components: {
            'score': require('../../widget/score.vue')
        }
    }
</script>