class HandlerEventTrap{
    constructor(handler={type:'',key:'',func:()=>{}}){
      const {type='',key='',func=()=>{}}=handler
      if(!(type && key && func))return undefined
      if(typeof func !="function")return undefined
      Object.defineProperty(this,'_type',{
        value:type,
        writable:false,
        configurable:false
      })
      Object.defineProperty(this,'_key',{
        value:key,
        writable:false,
        configurable:false
      })
      Object.defineProperty(this,'_func',{
        value:func,
        writable:false,
        configurable:false
      })
      Object.defineProperty(this,'_id',{
        value:type+'-'+key+'-'+parseInt(Math.random()*10**6),
        writable:false,
        configurable:false
      })
    }
  }
  class Trap{
    constructor(targetController){
      if(!targetController?.isTargetController){
        console.warn(' the targetController must be an instance of TargetController');
        throw 'the targetController is not instance of TargetController'
      }
      
      this.targetController=targetController
      this.handler=targetController.handler
    }
      get(target, key){
        if (key == "constructor") {
          return target[key];
        }
        
        return this.targetController.emitFromTrap('get',{
          break: false,
          key,
          value: target[key],
        },{target,key})??target[key]
      }
  
      set(target, key, value) {
        if (Array.isArray(target)) {
          if (key == "length"){
            target[key] = value;
            return true
          } 
        }
        
        this.targetController.emitFromTrap('set',{
          break: false,
          key,
          value: target[key],
          newValue: value,
        },{target,key, value})
        
        return true
      }
  
      deleteProperty(target, key){
        // if(!(key in target)) return false
        return this.targetController.emitFromTrap('delete',{
          break: false,
          key,
          value: target[key],
        },{target, key})??false
      }
  }
  class TargetController {
      constructor(target=this,handler={}) {
        // if (this.constructor === TargetController){
        //   console.warn("it's an abstract class, you can't make an instance of this class")
        //   throw "it's an abstract class, you can't make an instance of this class";
        // }
        if(typeof target !='object'){
          console.warn('the type of target must be an Object')
          throw 'the type of target must be an Object'
        }
        if(typeof handler !='object'){
          console.warn('the handler must be an Object');
          throw "the handler is not an Object"
        }
        this.target = target;
        this.handler = handler;
      }
      isTargetController=true
      #registre = {
        get: {},
        set: {},
        call: {},
        delete: {},
        change: {},
        emit:{}
      };
      createEvent(key, func,type,data={},originalHandlerEvent={}) {
        const registre = this.#registre[type];
        if (!registre[key]) registre[key] = [];
        const handler=new HandlerEventTrap({func,type,key})
        registre[key].push(handler);
        const position=()=>registre[key].indexOf(handler)
        Object.assign(handler,data)
        Object.defineProperty(handler,'_originalHandlerEvent',{
          value:originalHandlerEvent,
          writable:false
        })
        Object.defineProperty(handler,'_get',{
          get:this.getHandlerEvent.bind(this),
        })
        Object.defineProperty(handler,'_remove',{
          value:this.removeHandlerEvent.bind(this),
          writable:false
        })
        Object.defineProperty(handler,'_position',{
          get:position.bind(this)
        })
        Object.defineProperty(handler,'_lenOfRegistreHandlerEvent',{
          get:(()=>{return registre[key].length}).bind(this)
        })
        Object.defineProperty(handler,'_targetType',{
          value:this.target.constructor?.name
        })
        Object.defineProperty(handler,'_target',{
          value:this.target
        })
        
        return handler
      }
      get listType(){
        const list=[]
        for(let at in this.#registre){
          list.push(at)
        }
        return list
      }
      hasEventSpe(key,type){
        return Boolean(this.#registre[type][key])
      }
      dispatch(key, option, type) {
        const target = this.getHandlerEvent(key,type).filter(h=>h._key==key && h._type==type)
        if (!target) return;
        if (!Array.isArray(target)) return;
        const emit=()=>{
          target.forEach((handler) => {
            handler.$option=option
            if (typeof handler._func == "function") handler._func(handler);
            // handler.$option={}
          });
        }
        if(type=='changeR'){
          Promise.resolve().then(()=>emit())
        }else{
          emit()
        }
      }
      
      on(key, func, data, type,originalHandlerEvent =data) {
        this.isHandlerValid({key,func,type})
        var send = (key) => this.createEvent(key, func,type,data,originalHandlerEvent);
        if (typeof func == "function") {
          if (typeof key == "string" || typeof key == "number") {
            return send(key);
          } else if (Array.isArray(key)) {
            const listReturn = [];
            key.forEach((nm) => {
              listReturn.push(send(nm));
            });
            return listReturn;
          }
        }
      }
      isHandlerValid(handler){
        const isValid=(h)=>typeof h=='number' || typeof h =='string' || typeof h=='symbol'
        var sendMessageError=(msg)=>{
          console.warn(msg)
          throw msg
        }
        if (typeof handler != "object")sendMessageError('the handler must be an object')
        if (!("key" in handler))sendMessageError('handler.key is not defined')
        if(Array.isArray(handler.key)){
          if(!handler.key.length)sendMessageError('handler.key is Array empty []')
          handler.key.forEach((key,index)=>{
            if(!isValid(key)) sendMessageError(`handler.key at index ${index} must be a String or Number`)
          })
        }else if(!isValid(handler.key))sendMessageError('handler.key must be type String  or a Number or Array<String> or Array<Number>')
          
        if (!handler.func) sendMessageError('handler.func is not defined')
        if(typeof handler.func!='function') sendMessageError('handler.func must be a function')
        if (!handler.type) sendMessageError('handler.type is not defined')
        if(typeof handler.type!='string') sendMessageError('handler.type must be a string')
        if(!this.listType.includes(handler.type)) sendMessageError('value of handler.type is not valid ,  list of value valid are : '+this.listType)
        return true
      }
  
      // HandlerEvent.......................
      addHandlerEvent(handler) {
        if (typeof handler != "object"){
          console.warn('the handler must be an object');
          throw 'the handler must be an object'
        }
        const data=Object.assign({},handler)
        delete data.key
        delete data.func
        delete data.type
        const { key, func, type} = handler;
        return this.on(key, func, data, type,handler);
      }
      getHandlerEvent(key='*',type="*"){
        if(!key) return []
        const registre=[]
        const pushReg=(tpe)=>{
          let reg=this.#registre[tpe]
          if(reg){
            if(typeof reg!='object') return []
            for(let att in reg){
              reg[att].forEach(el=>{
                registre.push(el)
              })
            }
          }
        }
        
        if(type=="*"){
          for(let at in this.registre){
            const reg=this.registre[at]
            for(let att in reg){
              reg[att].forEach(el=>{
                registre.push(el)
              })
            }
          }
        }else if(Array.isArray(type)){
          type.forEach(t=>pushReg(t))
        }else{
          pushReg(type)
        }
        if(!registre.length)return [];
        if(!key)return []
        if(!Array.isArray(key) && typeof key!='string' && typeof key!='number')return []
        if(key=='*'){
          return registre
        }else if(Array.isArray(key)){
          return registre.filter(el=>key.find(val=>val==el._key))
        }else{
          return registre.filter(el=>el._key==key)
        }
      }
      removeHandlerEvent(handler) {
        var removing = (ref) => {
          if(ref?.constructor?.name!='HandlerEventTrap') throw 'handler must be an instance of HandlerEventTrap'
          var target = this.getHandlerEvent(ref._key,ref._type);
          if (!target) return false;
          var index = target.findIndex((el) => el._id === ref._id);
          if (index == -1) return false;
          const handlerDeleted=target.splice(index, 1)[0]
          delete handlerDeleted.$option
          return  {
            ...handlerDeleted,
            key:ref._key,
            func:ref._func,
            type:ref._type,
          }
        };
        if (Array.isArray(handler)) return handler.map((ref) => removing(ref));
        return removing(handler);
      }
  
      // Emiteur..................
      emitFromTrap(type,option,{target,key,handler}){
        if(this.#listExceptionTrap.includes(key)) return 
        if(this.listExceptionTrap.includes(key)) return
        if(typeof type !='string') return console.warn('the type must be a type string');
        if(!this.listType.includes(type)){
          console.warn(`this type ${type} in list `+this.listType);
          return
        }
        return this.#registreEmit?.[type]?.(option,{target,key,handler})
      }
      #registreEmit={
        'call':this.#emitCall.bind(this),
        'get':this.#emitGet.bind(this),
        'set':this.#emitSet.bind(this),
        'delete':this.#emitDeleteProperty.bind(this)
      }
  
      #emitDispatch(key,type,option){
        if(this.hasEventSpe('*',type)){
          this.dispatch("*", option,type);
        }
        if(this.hasEventSpe(key,type)){
          this.dispatch(key, option,type);
        }
      }
      #emitCall(option,{target,key,handler=this.handler}){
        
        this.#emitDispatch(key,'call',option)
        if(typeof handler.onCall=='function') handler.onCall(option,target,this.target)
  
          if (option.break) return () => {};
      }
      #emitGet(option,{target,key,handler=this.handler}){
        this.#emitDispatch(key,'get',option)
        if(typeof handler.onGet=='function') handler.onGet(option,target,this.target)
        if (option.break) return undefined;
        if (option.value != target[key]) return option.value;
        return target[option.key];
      }
      #emitSet(option,{target, key,handler=this.handler}){
        const value=option.value
        this.#emitDispatch(key,'set',option)
        if(typeof handler.onSet=='function') handler.onSet(option,target,this.target)
  
        if (option.break) return target[key];
        target[option.key] = option.newValue;
        if (target[key] != value) {
          option.oldValue=value
          option.value=target[key]
          if(typeof handler.onChange=='function') handler.onChange(option,target,this.target)
          this.#emitDispatch(key,'change',option)
        }
      }
      #emitDeleteProperty(option,{target, key,handler=this.handler}){
        this.#emitDispatch(key,'delete',option)
        if(typeof handler.onDelete=='function') handler.onDelete(option,target,this.target)
        
        target[key] = option.value;
        if(!option.break) delete target[key];
        return !option.break
      }
      emitCustomEvent(eventName,option={}){
        if(!eventName) return
        this.dispatch(eventName, option,'emit')
      }
  
      // event-listener..............
      onKeyWillGet=((key, func, data) => this.on(key, func, data, "get")).bind(this)
      onKeyWillSet=((key, func, data) => this.on(key, func, data, "set")).bind(this)
      onKeyHasChange=((key, func, data) => this.on(key, func, data, "change")).bind(this)
      onkeyWillCall=((key, func, data) => this.on(key, func, data, "call")).bind(this)
      onKeyWillDelete=((key, func, data) => this.on(key, func, data, "delete")).bind(this)
      onEventHasEmit=((key, func, data) => this.on(key, func, data, "emit")).bind(this)
  
      // target...................
      #listExceptionTrap=[
        "$on","$handlerEvent","$isTrap"
      ]
      #toBind(chaine, handler ) {
        const path=chaine
          // eslint-disable-next-line no-undef
          if (!handler?.$isTrap) handler = new Domlib.TrapLib(handler);
          const defaultReturn = {
            hasFinded:false,
            path,
            args:[],
            name:undefined,
            value:undefined,
            firstState:null,
            lastState:null
          }
          chaine = chaine.replace(/\s/g, "");
          const chaineSplited = chaine.split(".");
          var arg;
          if (chaineSplited.length == 1) {
            arg = chaine.match(/\(\s*([A-z,.]*)\s*\)/);
            if (arg) {
              chaine = chaine.slice(0, arg.index);
              arg = arg[1];
            }
      
            return chaine in handler
              ? {
                hasFinded:true,
                path,
                args:arg?.split?.(",")||[],
                name:chaine,
                value:handler[chaine],
                firstState:handler,
                lastState:handler
              }: defaultReturn;
            } else {
            if (!(chaineSplited[0] in handler)) return defaultReturn;
            var value = handler[chaineSplited[0]];
            if (typeof value != "object") return defaultReturn;
            for (let i = 1; i < chaineSplited.length - 1; i++) {
              if (typeof value != "object") return defaultReturn;
              value = value[chaineSplited[i]];
            }
            chaine = chaineSplited[chaineSplited.length - 1];
            arg = chaine.match(/\(\s*([A-z,.]*)\s*\)/);
            if (arg) {
              chaine = chaine.slice(0, arg.index);
              arg = arg[1];
            }
            if (typeof value != "object") return defaultReturn;
            if (chaine in value)
              return {
                hasFinded:true,
                path,
                args:arg?.split?.(",")||[],
                name:chaine,
                value:value[chaine],
                firstState:handler,
                lastState:value
              };
            return defaultReturn
          }
      }
      getByPath=function(path,...data){
        data.push(this.target)
          const defaultReturn={
            hasFinded:false,
            path,
            args:[],
            name:undefined,
            value:undefined,
            firstState:null,
            lastState:null
          }
          var valueFinded=defaultReturn
          if(typeof path !="string") return defaultReturn
          for(let indexStock=0;indexStock<data.length;indexStock++){
              let handler=data[indexStock]
              if(typeof handler!="object") continue
              valueFinded=this.#toBind(path,handler)
              if(valueFinded.hasFinded) break
          }
          return valueFinded
      }
  
      listExceptionTrap=[]
      insertController(target){
        if(target.$isTrap){
          console.warn("this target has arledy a controller : ",target);
          return false
        }
        Object.defineProperty(target,'$emitEvent',{
          get:(()=>this.emitCustomEvent.bind(this)).bind(this)
        })
        Object.defineProperty(target, "$on", {
          get:(()=>{
            return {
              get: this.onKeyWillGet.bind(this),
              set: this.onKeyWillSet.bind(this),
              call: this.onkeyWillCall.bind(this),
              change: this.onKeyHasChange.bind(this),
              delete: this.onKeyWillDelete.bind(this),
              emit:this.onEventHasEmit.bind(this)
            };
          }).bind(this),
          enumerable:false,
          configurable:false
        });
        Object.defineProperty(target, "$handlerEvent", {
          get:(()=>{
            const hand={
              get:this.getHandlerEvent.bind(this),
              remove:this.removeHandlerEvent.bind(this),
            }
            hand.add=null
            Object.defineProperty(hand, "add", {
              get:(()=>this.addHandlerEvent.bind(this)).bind(this),
              set:this.addHandlerEvent.bind(this)
            })
            return hand
          }).bind(this),
          enumerable:false,
          configurable:false
        })
        Object.defineProperty(target, "$isTrap", {
          get:(()=>true).bind(this),
          enumerable:false,
          configurable:false
        })
        Object.defineProperty(target, "$getByPath", {
          get:(()=>this.getByPath.bind(this)).bind(this),
          enumerable:false,
          configurable:false
        })
  
        return true
      }
      
    }
  class Traper extends TargetController {
      constructor(target = {},handler={}) {
        if(typeof handler != 'object'){
          console.warn('the handler must be an Object but not a',handler.constructor.name)
          handler={}
        }
        if(typeof target == "function" ){
          console.warn('the target type "function" is not alredy functioned , please don\'t use that...')
        }
        if (typeof target != "object" && typeof target != "function" ){
          const typeOfTarget=target.constructor.name
          target=new class Ref{
            value=target
            toString(){return this.value}
            valueOf(){return this.value}
          }
          Object.defineProperty(target.constructor,'name',{
            value:target.constructor.name+typeOfTarget
          })
        }
        super(target,handler);
        if(target.$isTrap ) return target
        
        this.insertController(target)
        return new Proxy(target, new Trap(this,handler));
      }
      static isConstructor(func) {
        return typeof func === 'function' && !!func.prototype && func.prototype.constructor === func;
      }  
}