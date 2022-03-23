class Pconsole{ 
    constructor(style={}){
        if(typeof style!=='object'){
            const c=new Pconsole
            c.style="color:green"
            c.ob="color:yellow"
            c.console="background:orange;color:purple"
            c.log(`$<console>Pconsole:Error$</d> The type of $<style>style$</end> must be an $<ob>object`)
            throw "↑↑↑↑↑ TYPE_STYLE_ERROR ↑↑↑↑↑"
        }
        Object.assign(this,style)
        Object.defineProperty(this,'getlog',{
            writable:false,
            configurable:false
        })
        Object.defineProperty(this,'log',{
            writable:false,
            configurable:false
        })
    }
    
    getlog=(message,styles={})=>{
        if(typeof styles!=='object'){
            const c=new Pconsole
            c.style="color:green"
            c.ob="color:yellow"
            c.console="background:orange;color:purple"
            console.log(...c.getlog(`$<console>Pconsole:Error$</d> The type of $<style>style$</end> must be an $<ob>object`))
            throw "↑↑↑↑↑ TYPE_STYLE_ERROR ↑↑↑↑↑"
        }
        if(typeof message!=='string'){
            const c=new Pconsole
            c.style="color:green"
            c.ob="color:yellow"
            c.console="background:orange;color:purple"
            console.log(...c.getlog(`$<console>Pconsole:Error$</d> The type of $<style>message$</end> must be an $<ob>string`))
            throw "↑↑↑↑↑ TYPE_STYLE_ERROR ↑↑↑↑↑"
        }
        Object.assign(this,styles)
        const regex=/\$<\/?([A-z0-9\-]+)>/gm
        const result=message.match(regex)
        var newMessage=""
        const listStyleRule=[]
        if(result){
            newMessage=message.replace(regex,'%c')
            result.forEach(selector => {
                listStyleRule.push(this[selector.slice(2,-1)])
            });
            return [newMessage,...listStyleRule]
        }else{
            return [message]
        }
    }
    log=(message,styles={})=>{
        console.log(...this.getlog(message,styles))
    }
}