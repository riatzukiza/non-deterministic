"use strict";
var EventEmitter = require("events").EventEmitter;
var Q = require("q");
var oldEmit =  EventEmitter.prototype.emit;
require("util").inherits(NonDeterministicEventEmitter,EventEmitter);
function NonDeterministicEventEmitter() {
  EventEmitter.call(this,...arguments);
};
function firstLetterUppercase(string) {
  try {
    var Propername = string.split("");
    Propername[0] = Propername[0].toUpperCase();
    Propername = Propername.join("");
    console.log("propername",Propername);
    return Propername;
  } catch(err) {
    throw err;
  }
};
NonDeterministicEventEmitter.prototype.emit = function()  {
  var args = [].slice.call(arguments,1);
  var name = arguments[0];
  oldEmit.call(this,"any",args,name);
  oldEmit.apply(this,arguments);
};
function walkHiddenPrototype(hiddenName,Propername,obj) {
  return Q(obj[hiddenName].call(this,...arguments))
    .then((result) => {
      this.emit("after"+Propername,result);
      return result;
    })
    .catch(err => {
      this.emit("attempted",err);
      obj = Object
        .getPrototypeOf(obj)
      if(NonDeterministicEventEmitter
          .prototype
          .isPrototypeOf(obj) 
          && typeof obj[hiddenName] === "function") {
        return walkHiddenPrototype.call(this,hiddenName,Propername,obj);
      }
      throw err;
    });
};
function walkProperPrototype(Propername,obj,args) {
  var superObject = obj.getPrototypeOf();
  if(superObject[Propername]) {
    return Q(superObject[Propername].call(this))
      .catch((err) => {
        return walkProperPrototype.call(this,Propername,superObject,args);
      });
  }
  let err = new TypeError("all possibilities exausted");
  this.emit("fail"+Propername,err);
  return Q.reject(err);
};
function choicePoint(unit,name,pre,expectedOutCome) {
  var outerArgs = [].slice.call(arguments);
  unit.prototype[name] = function () {
    console.log("choice being made",outerArgs);
    var hiddenName = "_"+name;
    var Propername = firstLetterUppercase(name);
    console.log("names",hiddenName,Propername);
    this.emit("before"+Propername,...arguments);
    if(typeof pre === "function") {
      console.log("there was a pre condition given");
      return Q()
        .then(() => pre.call(this,...arguments))
        .catch((err) => {
          console.log("precondition failed",err);
          return walkHiddenPrototype.call
          (this,hiddenName,Propername,this)
            .then((v) => {
              return typeof expectedOutCome === "function"
                ? expectedOutCome.call(this,v,arguments) : v
            });
        });
    }
    console.log("no pre condition")
    return walkHiddenPrototype.call
      (this,hiddenName,Propername,this)
        .then(expectedOutCome||null)
        .catch(err => walkProperPrototype.call
            (this,Propername,this,arguments));
      
  };
};
NonDeterministicEventEmitter.choicePoint = choicePoint;
module.exports = NonDeterministicEventEmitter;
