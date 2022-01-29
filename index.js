// set encoding to utf8
process.stdout.setEncoding('utf8')

const async = require('async')
const colors = require('chalk')
const pkg = require('./package')

class Log {
  /**
   * Log boxes
   *
   * @param {*} parent - a parent box or a line
   * @param opt
   * @constructor
   */
  constructor(parent, opt){
    // generate id (time+rand)
    this.id = (new Date().getTime()).toString(36)+((Math.random().toString(36).substr(2, 5)))

    this.lines = []
    this.parent = null
    this.level = 0
    this.printedLines = 0
    //	this.colors = colors

    // make utils accessible
    this.col = Log.col
    this.strip = Log.strip
    this.pad = Log.pad

    // set color to colorText by default
    if(typeof opt === 'object' && opt.color && !opt.colorText)
      opt.colorText = opt.color

    // default options
    this.opt = Object.assign({
      console:    null,                                   // object to receive the output of console2
      border:     typeof opt === 'number' ? opt : 1,      // vertical border width (1 or 2)
      color:      typeof opt === 'string' ? opt : 'grey', // border color
      colorText:  typeof opt === 'string' ? opt : 'grey', // text color
      isWorker:   false,                                  // run as a worker
      map:        [['...','…']],                          // auto replace
      enableAutoOut: false,                               // enable auto out calls (used when in node console)
      disableWelcome: false,                              // disable our kind welcome line
      override:   false,                                  // override nodes console
      animate:    false,                                  // animate idle status
      over:       false                                   // box status
    }, opt||{})

    // is direct log
    if(this._instanceof(parent)){
      this.parent = parent
      this.level = parent && parent.level ? parent.level+1 : 1

      // inherit console object when not given
      if(!this.opt.console)
        this.opt.console = this.parent.opt.console
    }

    // use default
    if(!this.opt.console)
      this.opt.console = Log.console

    this.timer = {
      _: new Date().getTime(),
      _calls: {}
    }

    if(this.level === 0){
      // animate
      if(this.opt.animate){
        process.on('SIGINT', () => {
          Log.clearLine()
          process.stdout.write(Log.col('┘', this.opt.color)+"\n")
          process.exit()
        })

        // passive set interval
        setInterval(this._animate.bind(this), 500).unref()
      }
    }
  }

  //─── Static methods ──────────────────────────────────────────────────

  /**
   * Color[color] shortcut
   *
   * @param {String} str - the text
   * @param {...String} cmd - the color or action (red, bold...)
   * @returns {*}
   */
  static col(str, cmd){
    const cmds = Array.prototype.slice.call(arguments, 1)

    // convert 2 str
    if(typeof str != 'string')
      str += ''

    let res = str

    switch(cmd){
      // rainbow
      // using the first 5 colors of Log.chalkColors
      case 'rainbow':
        const cols = Log.chalkColors.slice(0, 5)
        return str.split('').map(function(char, i){
          return colors[cols[i % cols.length]](char)
        }).join('')

      // zebra
      // using white, then bgWhite & black
      case 'zebra':
        return str.split('').map(function(char, i){
          return i % 2 ? colors.white(char) : colors.bgWhite.black.dim(char)
        }).join('')

      case 'code':
        return colors.bgBlue.white(str.split('').map(function(char){
          if('.,:;=()[]{}+-*|"/\''.indexOf(char) > -1)
            return colors.grey(char)
          return char
        }).join(''))
    }

    // add attributes
    cmds.forEach(function(cmd){
      res = colors[cmd](res)
    })

    return res
  }

  /**
   * Clear terminal line + set cursor to 0
   */
  static clearLine(){
    process.stdout.clearLine()
    process.stdout.cursorTo(0)

    return process.stdout
  }

  /**
   * Truncate string
   *
   * @param {String} str
   * @param {Number} length
   * @param {String} [postfix]
   * @returns {String}
   */
  static truncate(str, length, postfix){
    // convert 2 string
    str = str+''
    const plain = Log.strip(str)

    // no action required
    if(plain.length <= length)
      return str

    // default postfix
    if(!postfix) postfix = '…'

    // subtract postfix from length
    length -= postfix.length

    // return empty
    if(length < 0)
      return ''

    return str.substring(str, length) + postfix
  }

  /**
   * Uppercase first character
   * @param {String} str
   * @returns {String}
   */
  static capitalize(str){
    return str.substr(0,1).toUpperCase()+str.substr(1)
  }

  /**
   * Pad a str
   *
   * Use in three ways:
   * .pad('-', 5)                 = '-----'
   * .pad('.', 7, 'Hello')        = 'Hello..'
   * .pad(' ', 7, 'Hello', true)  = '  Hello'
   *
   * @param {String} padSymbol
   * @param {Number} length
   * @param {String} [str]
   * @param {Boolean} [useLeftSide]
   * @returns {String}
   */
  static pad(padSymbol, length, str, useLeftSide){
    let out = ''

    if(str){
      while(str.length < length){
        if(useLeftSide)
          str = padSymbol + str
        else
          str += padSymbol
      }
      return str
    }
    for(let i = 0; i < length; i += padSymbol.length){
      if(useLeftSide)
        out = padSymbol + out
      else
        out += padSymbol
    }

    return out
  }

  /**
   * Format str in printf style as console does
   * Slightly edited version of the original node utils.format
   *
   * @param f
   * @returns {*}
   */
  static format(f) {
    const args = Array.prototype.slice.call(arguments)
    if(args.length === 1) return args

    let i = 1
    const len = args.length
    const str = String(f).replace(/%[sdj%]/g, function(x){
      if(x === '%%') return '%'
      if(i >= len) return x

      switch (x) {
        case '%s': return String(args[i++])
        case '%d': return Number(args[i++])
        case '%j':
          try {
            return JSON.stringify(args[i++])
          } catch (_) {
            return '[Circular]'
          }
        // falls through
        default:
          return x
      }
    })

    // formatting happened
    if(str !== args[0]){
      // use result
      args[0] = str
      // remove formatting argument
      args.splice(1, 1)
    }

    return args
  }

  /**
   * Check if script is run from terminal
   *
   * @returns {boolean}
   */
  static isTerminalConsole(){
    return module && module.parent && (module.parent.id+'') === 'repl'
  }

  /**
   * Parse keywords / add colors
   *
   * @param word
   * @returns {String}
   * @private
   */
  static parseWord(word){
    // basic types
    if(word === null)
      word = colors.grey.italic('null')
    else if(word === undefined)
      word = colors.red('undefined')
    else if(word === true)
      word = colors.green.bold('true')
    else if(word === false)
      word = colors.bold.red('false')
    else if(word === pkg.name){
      word = Log.col(word, 'rainbow')
    }
    else if(typeof word == 'number')
      word = colors.cyan(word+'')
    else {
      let s = word.toString()
      switch(s){
        default: s = null
      }

      if(s)
        word = s
    }

    return word
  }

  /**
   * Wrap text
   *
   * @param {String} str
   * @param {Number} length
   * @returns {*}
   */
  static wrap(str, length){
    const lineWrap = require('linewrap')

    return lineWrap(length, {
      skipScheme:'ansi-color',
      respectLineBreaks: 'multi',
      tabWidth: 3
    })(str)
  }

  /**
   * Get stdout columns
   *
   * @returns {number}
   * @private
   */
  static getTerminalWidth(){
    return process.stdout.columns-1 || 100
  }

  /**
   * Pluralize a string, poor mans function
   *
   * @param nr
   * @param str
   * @returns {string}
   */
  static plural(nr, str){
    const i = parseFloat(nr)
    nr = typeof nr == 'number' ? nr.toFixed(0) : nr

    return str.replace('%s', Log.col(nr, 'cyan')) + (i !== 1 ? 's' : '')
  }

  // clone console
  static console = Object.assign({}, console)

  // color names
  static chalkColors = ['cyan','green','yellow','red','magenta','blue','white','grey','black']
  static chalkCommands = ['reset','bold','dim','italic','underline','inverse','hidden','strikethrough']

  // shortcuts
  static strip = colors.stripColor

  //─── Dynamic methods ──────────────────────────────────────────────────

  /**
   * Override the console with this
   *
   * @returns {Log}
   */
  overrideConsole(){
    // im a dirty little whore
    if(console instanceof Log)
      return this.warn('Console already overwritten')

    if(Log.isTerminalConsole()){
      // disable 'undefined' console messages
      process.stdin.emit('data', 'module.exports.repl.ignoreUndefined = true;\n')
    }

    // copy original console
    this.opt.console = Log.console

    // override console
    console = Object.assign(console, this)

    // finish
    return this
  }

  /**
   * Set options
   *
   * @param {String|Number|Object} opt
   * @returns {Log}
   */
  options(opt){
    if(opt === undefined)
      return this

    // handle options('string') - color and 'ready'
    if(typeof opt == 'string'){
      opt = {color:opt}
    }
    // handle options(2) - border width
    else if(opt === 1 || opt === 2){
      opt = {border:opt}
    }

    // use color as colorText when colorText not given
    if(opt.color && !opt.colorText)
      opt.colorText = opt.color

    // set options
    this.opt = Object.assign(this.opt, opt)

    return this
  }

  /**
   * Create a new box
   *
   * @param [line]
   * @param [opt]
   * @returns {Log}
   */
  box(line, opt){
    if(arguments.length === 1){
      // line could be either an option or a line
      if(typeof line === 'string'){
        // check if line is color
        if(Log.chalkColors.indexOf(line) > -1 || Log.chalkCommands.indexOf(line) > -1){
          opt = {color:line}
        }
      }
      // line is no string and therefore an option
      else {
        opt = line
        line = null
      }
    }

    // create box
    const box = new Log(this, opt||{})

    // auto add 1st line when given
    if(line){
      box.line(line)
    }

    // add box to myself
    this.line(box)

    return box
  }

  /**
   * Display help
   */
  help(){
    require('./help')
  }

  /**
   * Save a line to buffer
   *
   * @param {String|Object} line
   * @param {...String|Object} [option]
   * @returns {Log}
   */
  line(line, option){
    let args = Array.prototype.slice.call(arguments)
    const obj = {
      prefix: ' ',
      color: this.opt.color,
      colorText: this.opt.colorText
    }

    // handle .line()
    if(line === undefined){
      args[0] = undefined
    }

    // try to find an option
    option = (args[args.length-1]+'')

    // prefix
    if(option.substr(0,4) === 'pre:'){
      args.pop()
      obj.prefix = option.substr(4)
    }
    // color
    else if(Log.chalkColors.indexOf(option) > -1 || Log.chalkCommands.indexOf(option) > -1){
      args.pop()
      obj.color = option
      obj.colorText = option
    }

    // use format (sprintf) like console does
    args = Log.format.apply(this, args)

    // handle section
    const processStash = () => {
      // empty line (undefined,'')
      if(!stash.length && line === undefined){
        this.lines.push(obj)
      }
      // join word string
      else if(stash.length){
        obj.line = stash.join(' ')

        // replace map (... > …)
        if(Array.isArray(this.opt.map)){
          this.opt.map.forEach(function(arr){
            obj.line = obj.line.replace(arr[0],arr[1])
          })
        }

        this.lines.push(obj)
      }
      // log
      else if(this._instanceof(line)){
        this.lines.push(line)
      }

      // empty stash
      stash = []
    }

    // iterate args
    let stash = []
    args.forEach(function(word){
      // types to strings
      word = Log.parseWord(word)

      // is str
      if(typeof word == 'string'){
        stash.push(word)
      }
      // object
      else {
        // skip sub boxes
        if(this._instanceof(word))
          return

        // add to this.lines
        processStash()

        // log obj
        this._try(this._object, word)
      }
    }.bind(this))

    // add
    processStash()
    return this
  }

  /**
   * Alias for this.line
   *
   * @returns {Log}
   */
  _(...args){
    return this.line.apply(this, args)
  }

  /**
   *  Alias for this.line
   *
   * @returns {Log}
   */
  log(...args){
    this.line.apply(this, args)
    return this.out()
  }

  /**
   * info - Alias for this.log in "green"
   *
   * @returns {Log}
   */
  info(...args){
    args.push('green')
    this.line.apply(this, args)
    this.out('info')
    return this
  }

  /**
   * ok - Shortcut to indicate sth went alright
   *
   * @returns {Log}
   */
  ok(){
    this.time('_').out()
    return this
  }

  /**
   * Alias for this.log
   *
   * @returns {Log}
   */
  dir(...arg){
    return this.log(...arg)
  }

  /**
   * Alias for this.line in "red"
   *
   * @returns {Log}
   */
  error(...args){
    // add red
    args.push('red')

    // log
    if(this.line){
      this.line.apply(this, args)
      this.out('error')
    }

    return this
  }

  /**
   * Alias for this.line in "yellow"
   *
   * @returns {Log}
   */
  warn(...args){
    // add yellow
    args.push('yellow')

    // log
    this.line.apply(this, args)
    this.out('warn')

    return this
  }

  /**
   * Output time
   *
   * Use as:
   * .time()                              - Prints time since box was initialized
   * .time('TimerName') (1st call)        - starts a timer for tony, outputs 'TimerName: start'
   * .time('TimerName', true) (1st call)  - same as above, no output
   * .time('TimerName') (2nd call)        - outputs 'TimerName: Xms'
   * .time('TimerName', true) (2nd call)  - outputs 'TimerName: Xms - reset', resets the timer
   *
   * @param {String} [label]
   * @param {Boolean} [reset]
   * @returns {Log}
   */
  time(label, reset){
    const now = new Date().getTime()

    // initialize timer
    if(label && !this.timer[label]){
      this.timer[label] = now

      // finish quietly
      if(reset)
        return this._autoOut()

      // indicate event
      this.line(Log.col(label, 'green')+': start')

      return this._autoOut()
    }

    // calc
    let passed = (now - (this.timer[label || '_']))
    let lastExec = this.timer._calls[label || '_']

    // build line
    let line = Log.col(label === '_'?'OK':label || 'Time',passed<=10?'green':(passed<=100?'yellow':'red'))+Log.col(': ', 'grey')
      + Log.col(passed.toFixed(0)+'ms', label === '_' ? 'grey' : 'white')
      + (reset ? Log.col(' - ', 'grey') + Log.col('reset', 'yellow'):'')

    // add "+Xms"
    if(lastExec){
      lastExec = (now - lastExec)

      let str = lastExec.toFixed(0)
      str = ' '+Log.col(Log.pad('─', (Log.getTerminalWidth()-(this.level+2)-Log.strip(line).length-str.length) - 7), 'grey')
        + ' +'+lastExec.toFixed(0)+'ms'

      if(lastExec <= 10)
        str = Log.col(str, 'green')
      if(lastExec <= 100)
        str = Log.col(str, 'yellow')
      if(lastExec > 100)
        str = Log.col(str, 'red')

      line += str
    }

    // reset timer
    if(label && this.timer[label] && reset){
      this.timer[label] = now
    }

    // output time passed
    this.line(line)

    // save call time
    this.timer._calls[label||'_'] = now

    if(passed > 10000){
      const res = []
      const struc = {
        year: 31536000,
        month: 2592000,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1
      }

      let delta = passed / 1000

      // calc time
      Object.keys(struc).forEach(function(key){
        const r = Math.floor(delta / struc[key])
        struc[key+'s'] = r
        delta -= r * struc[key]

        if(r > 0 || res.length > 0)
          res.push(Log.plural(r, '%s '+key))
      })

      this.box(Log.col(res.join(' + '), 'grey')).over()
    }

    // output?
    return this._autoOut()
  }

  /**
   * Alias for this.time
   *
   * @returns {Log}
   */
  timeEnd(...args){
    return this.time(...args)
  }

  /**
   * trace - beautified
   *
   * @param {String} [message]
   */
  trace(message){
    const obj = {}
    Error.captureStackTrace(obj, this)

    const lines = []
    obj.stack.split("\n").forEach(function(line, indexLine){
      // remove surrounding whitespaces
      line = line.trim()
      const words = []

      // 1st line
      if(indexLine === 0){
        return lines.push(colors.yellow(message||'Trace')+colors.grey(': ')+colors.cyan(line))
      }
      // skip trace to this place
      else if(indexLine === 1){

      }
      // show rest of stack
      else {
        // split to words
        line.split(' ').forEach(function(word, indexWord){
          switch(indexWord){
            case 0:
              //words.push(colors.grey(word))
              break

            case 1:
              words.push(colors.white(word))
              break

            case 2:
              words.push(colors.grey(word))
              break
          }
        })

        lines.push(words.join(' '))
      }
    })

    let box
    lines.forEach(function(line, i){
      if(i === 0)
        return box = this.line(line)

      box = box.box(line).over()
    }.bind(this))

    if(box)
      box._autoOut()

    return this
  }

  /**
   * Display text inside a box
   *
   * @param line
   * @returns {Log}
   */
  title(line){
    const args = Array.prototype.slice.call(arguments)
    const maxWidth = Log.getTerminalWidth()

    // top border
    this.line(Log.col(Log.pad('─', maxWidth - this.level - 2)+'┐', this.opt.color, 'dim'), 'pre:')

    // build line
    this.line.apply(this, args)

    // get inserted line
    const newLine = this.lines[this.lines.length-1]

    // add right border
    newLine.line += Log.pad(' ', maxWidth - this.level - Log.strip(newLine.line).length - 3)
      + Log.col('│', this.opt.color, 'dim')

    // save to this.lines
    this.lines[this.lines.length-1] = newLine

    // bottom border
    this.line(Log.col((Log.pad('─', maxWidth - this.level - 2)+'┘'), this.opt.color, 'dim'), 'pre:')

    // use out?
    return this
  }

  /**
   * End the current line and insert an empty line (uses this.out!)
   */
  spacer(){
    // end line
    this.out()
    // empty line
    this.opt.console.log(Log.col('┘', this.opt.col||'grey'))
    this.printedLines = 0

    return this
  }

  /**
   * beep sound
   *
   * @returns {*}
   */
  beep(label){
    process.stdout.write('\x07')
    return this.line(Log.col('BEEP'+(typeof label == 'string'?': '+label:''), 'red'))//.out()
  }

  /**
   * Build output string
   *
   * @param {Function} callback
   * @param {Boolean} [preserveLines=false]
   * @returns {string}
   */
  _buildString(callback, preserveLines){
    const lines = []
    const maxWidth = Log.getTerminalWidth()
    let body = ''
    let allNr = 0
    let mapBase = this

    // gather lines
    const walk = (log, callbackWalk) => {
      let boxNr = 0

      // iterate lines
      async.each(log.lines, function(line, callbackLines){
        // sub box
        if(this._instanceof(line)){
          return line.opt.over ? walk(line, callbackLines) : callbackLines()
        }

        // format
        lines.push({
          id: log.id,
          level: log.level,
          boxNr: boxNr,
          allNr: allNr,
          prefix: line.prefix,
          color: line.color,
          colorText: line.colorText,
          line: line.line,
          log: log
        })

        // remove printed lines from stack
        if(!preserveLines){
          //				Log.console.log('REMOVE', log.lines)
          log.lines = log.lines.filter(function(l){
            if(log._instanceof(l)) return l.id !== log.id
            return l !== line
          })
          //				this.lines = this.lines.filter(function(l){
          //					if(this._instanceof(l)) return l.id != log.id
          //					return l.line == line.line// || l.id == log.id
          //				}.bind(this))
        }

        // count
        boxNr++
        allNr++

        // end
        callbackLines()
      }.bind(this), () => callbackWalk())
    }

    // prepare
    walk(this, () => {
      // iterate
      async.each(lines, (obj, callbackLine) => {
          const i = lines.indexOf(obj)

          // count total output
          this.printedLines++

          // structure
          const pre = {
            str: '',
            plain: ''
          }

          // shortcuts
          obj.levelPrev = lines[i-1] ? lines[i-1].level : null
          obj.levelNext = lines[i+1] ? lines[i+1].level : null
          obj.hasPrev = lines[i-1] || false
          obj.hasNext = lines[i+1] || false
          obj.hasBoxPrev = obj.hasPrev && obj.hasPrev.id === obj.id
          obj.hasBoxNext = obj.hasNext && obj.hasNext.id === obj.id

          // iterate level times (|)
          for(let posLeft = 0; posLeft <= obj.level; posLeft++){
            let s

            // set base obj
            mapBase = obj.log.getParent(obj.level-posLeft)

            // 1st from right
            if(posLeft === obj.level){
              if(this.printedLines === 1 && obj.level === 0)
                s = '┌'
              else if(obj.hasNext && obj.level === 0){
                if(Log.strip(obj.line) === 'undefined')
                  s = '│'
                else
                  s = '├'//┌
              }
              else if(obj.boxNr === 0){
                if(obj.hasBoxNext || obj.levelNext > obj.level)
                  s = '┬'//┬
                else if(obj.hasBoxPrev)
                  s = '└'//└
                else if(obj.level === 0){
                  if(obj.line.substr(0,2) === '  ')
                    s = '│'
                  else
                    s = '├'
                }
                else
                  s = '─'//─
              }
              else if(obj.hasNext && obj.levelNext >= obj.level && Log.strip(obj.line) === 'undefined')
                s = '│'
              else if(
                obj.hasNext
                && (
                  obj.hasNext.log.id === obj.log.id
                  || (
                    obj.hasNext.log
                    && obj.hasNext.log.parent
                    && obj.hasNext.log.parent.id === obj.log.id
                  )
                )
              )
                s = '├'
              else if(['═','╛'].indexOf(obj.prefix.substr(0,1)) > -1)
                s = '╘'
              else if(obj.level === 0)
                s = '├'
              else
                s = '└'
            }
            // 2nd from right when first of box
            else if(obj.boxNr === 0 && posLeft === obj.level-1){
              if(!obj.hasPrev)
                s = '┬'//┌├
              else if(!obj.hasNext || obj.hasNext && obj.hasNext.log.level < obj.level-1)
                s = '┴'
              else {
                s = '├'
              }
            }
            // 2nd from right when no next (is closing)
            else if(!obj.hasBoxNext && obj.levelNext < obj.level-1 && posLeft === obj.level-1)
              s = '┘'//┘
            else if(!obj.hasBoxNext && obj.levelNext < obj.level-1){
              if(!obj.hasNext){
                if(posLeft === 0)
                  s = '├'//└
                else if(posLeft < obj.level)
                  s = '┴'
                else
                  s = '└'
              }
              else {
                if(posLeft === obj.levelNext)
                  s = '├'
                else if(posLeft < obj.levelNext)
                  s = '│'
                else if(posLeft === 0 || posLeft === obj.levelNext)
                  s = '├'
                else{
                  s = '┴'
                }
              }
            }
            // any other char
            else {
              //					if(posLeft === 0 && !obj.hasNext)
              //						s = '┘'
              //					else
              if(posLeft === 0 && !obj.hasPrev)
                s = '├'
              else
                s = '│'
            }

            if(s){
              pre.plain += s
              pre.str += mapBase._map(s)
            }
          }

          // add final prefix (customizable)
          pre.plain += obj.prefix
          pre.str += Log.col(obj.prefix, obj.log.opt.color)

          // create str
          const str = {
            str: obj.line
          }

          // add plain str
          str.plain = Log.strip(str.str)

          switch(str.plain){
            case 'undefined':
              str.str = ''
              break

            case '---':
              str.str = ''
              const width = Log.getTerminalWidth() - obj.level - 1
              for(let iLine = 0; iLine < width; iLine++){
                str.str += '─'
              }
              pre.str = pre.str.substr(0,pre.str.length-6)
              pre.plain = pre.plain.substr(0,pre.plain.length-1)
              str.str = Log.col(str.str, obj.color, 'dim') //+'┤')
              break
          }

          // truncate
          if((pre.plain.length + str.plain.length) > maxWidth || str.plain.indexOf('\n') > -1){
            // generate new lines
            const addLines = Log.wrap(str.str, maxWidth - obj.level-10).split('\n')
            str.str = ''

            // iterate new lines
            addLines.forEach((line, posTop) => {
              const isTopLast = posTop === addLines.length - 1

              line = ' '+Log.col(line, obj.color, 'bold')

              // iterate prefix chars
              pre.str = ''
              pre.plain.split('').slice(0, -1).forEach((char, posLeft, all) => {
                const isLeftLast = posLeft === all.length-1
                let s

                if(isLeftLast && posTop === 0){
                  if(char === '└')
                    s = '├'
                  else if(char === '├')
                    s = '├'
                  else{
                    s = '┌'
                  }
                }
                else if(isLeftLast && !isTopLast)
                  s = '│'
                else if(isLeftLast && isTopLast){
                  if(obj.hasNext && (obj.hasNext.level === obj.level+1 || obj.hasNext.level === obj.level))
                    s = '│'
                  else if(obj.level === 0){
                    s = '├'
                  }
                  else
                    s = '└'
                }
                else if(posTop && ['┴','┘'].indexOf(char) > -1)
                  s = ' '
                else if(!posLeft && posTop)
                  s = '│'
                else if(char === '├' && posTop !== 0)
                  s = '│'
                else
                  s = char

                if(s)
                  pre.str += this._map(s)
              })

              // add truncated
              body += "\n" + Log.col(pre.str, obj.color) + Log.col(line, obj.colorText)
            })
          }
          else {
            // add without truncation
            body += "\n" + pre.str + Log.col(str.str, obj.colorText, 'bold')
          }

          callbackLine()
        },
        // bind callback so the garbage collector doesn't eat it
        function(){ arguments[0](body) }.bind(this, callback))
    })
  }

  /**
   * Mark a sub box as ready for output.
   *
   * @returns {undefined|Log}
   */
  over(){
    const args = Array.prototype.slice.call(arguments)

    // mimic .line
    if(args.length)
      this.line.apply(this, args)

    // set ready
    this.opt.over = true

    // end
    return this._return()
  }

  /**
   * Output box string
   *
   * @param {String} [method="log"]
   * @returns {*}
   */
  out(method){
    if(!method) method = 'log'

    // mark as ready to print
    this.opt.over = true

    // enable .line args
    if(method && Object.keys(Log.console).indexOf(method) < 0){
      const args = Array.prototype.slice.call(arguments)
      this.line.apply(this, args)
    }

    // use parent out when available
    if(this.parent){
      return this.parent.out()
    }

    // try to build
    this._try(
      this._buildString,
      str => {
        str = str.substr(1)

        // the output
        if(str){
          Log.clearLine()
          process.stdout.write(str+'\n')
        }


        // clear lines
        //			this.lines = []
      }
    )

    return this._return()
  }

  /**
   * Return buffer as string
   * @returns {Promise<any>}
   */
  build(stripLevels, useParent){
    return new Promise((res) => {
      // mark as ready to print
      this.opt.over = true;

      // use parent out when available
      (useParent ? (this.parent || this) : this)._buildString(function(str){
        str = str.substr(1)
        if(stripLevels > 0){
          str = Log.strip(str)
          str = str.replace(new RegExp('^.{'+stripLevels+'}(.+\n?)$', 'gm'), '$1')
        }
        return res(str)
      }, true)
    })
  }

  /**
   * Return a specific parent for _buildString structure
   *
   * @param [generations=1]
   */
  getParent(generations){
    let log = this

    while(generations > 0){
      if(!log.parent)
        return generations = 0

      log = log.parent
      generations--
    }

    return log
  }

  _animate(){
    Log.clearLine()

    if(this.level || !this.opt.animate)
      return

    const animation = ['└','┘']

    if(!this._animation || this._animation > animation.length-1)
      this._animation = 0

    process.stdout.write(this.col(animation[this._animation], this.opt.color))
    this._animation++
  }

  /**
   * Make sure promised are not used when on node console
   *
   * @returns {undefined|Log}
   * @private
   */
  _return(){
    // don't use promise on node console
    return Log.isTerminalConsole() ? undefined : this
  }

  /**
   * Try-catch a function with args
   *
   * @param {Function} funct
   * @param {...*} arg
   * @private
   */
  _try(funct, arg){
    const args = Array.prototype.slice.call(arguments)
    args.shift()

    try {
      funct.apply(this, args)
    } catch(error) {
      if(error instanceof RangeError){
        this
          .line('RangeError: '+error.message, 'red')
          .line('Fallback to native console:').out()
        Log.console.log("\n", arg)
      }
    }
  }

  /**
   * Determine whether instance is an instance of Log or console.Console (if override happened)
   *
   * @param {*} instance
   * @returns {boolean}
   * @private
   */
  _instanceof(instance){
    return instance ? instance instanceof Log || instance instanceof Log.console.Console : false
  }

  /**
   * Use out when there is no parent
   *
   * @returns {Log}
   * @private
   */
  _autoOut(){
    return this.parent === null && this.opt.enableAutoOut === true ? this.out() : this
  }

  // ─── Dynamic private methods ──────────────────────────────────────────────────

  /**
   * Map symbols
   *
   * @param sym
   * @returns {*}
   * @private
   */
  _map(sym){
    const opt = this.opt

    if(opt.border > 1){
      switch(sym){
        case '╘': sym = '╚'; break
        case '┌': sym = '╓'; break
        case '┘': sym = '╜'; break
        case '│': sym = '║'; break
        case '├': sym = '╟'; break
        case '└': sym = '╙'; break
        case '┬': sym = '╥'; break
        case '┼': sym = '╫'; break
        case '┴': sym = '╨'; break
      }
    }

    if(opt.color){
      sym = colors[opt.color||'white'](sym)
    } else
      sym = (sym).grey

    return sym
  }

  /**
   * Add an object table
   *
   * @param {Object} obj
   * @param {Object} [data]
   * @private
   */
  _object(obj, data){
    // handle data
    data = Object.assign({
      title: null,
      colors: ['cyan', 'green', 'yellow', 'red', 'magenta'],
      pathLabel: '#',
      padKey: 15,
      padVal: 45,
      maxLevel: this.level,
      stdWidth: Log.getTerminalWidth()
    }, data)

    // gather structural layout data
    const compile = (objSub, level) => {
      // handle array
      if(Array.isArray(objSub)){
        // count key length
        data.padKey = Math.max(data.padKey, objSub.length)

        // handle values (can go deeper)
        return objSub.forEach((val, indexArray) => compile(val, level+1, indexArray))
      }

      // handle object
      if(objSub && typeof objSub === 'object'){
        // add obj.toString name (40/60 to key & val)
        data.padKey = Math.max(data.padKey, Math.round(objSub.toString().length *.4)+2)
        data.padVal = Math.max(data.padVal, Math.round(objSub.toString().length *.6)+2)

        // handle first level of keys
        return Object.keys(objSub).forEach((key, indexObj) => {
          // count key length
          data.padKey = Math.max(data.padKey, (key+'').length)

          // handle value (can go deeper)
          compile(objSub[key], level+1, indexObj)
        })
      }

      // count level
      data.maxLevel = Math.max(data.maxLevel, level)

      // handle value
      data.padVal = Math.max(data.padVal, (objSub+'').length)
    }

    /**
     * Insert any object
     *
     * @param {Object} objSub
     * @param {Log} parent
     * @param {String} [title]
     * @param {Array} [path]
     * @type {function(this:Log)}
     */
    function insert(objSub, parent, title, path){
      if(!path) path = [data.pathLabel]

      // create sub box
      const keys = Object.keys(objSub)
      const box = parent.box().over()

      // calc colors
      let color = data.colors[(box.level-this.level-1) % data.colors.length]
      let objStr

      if(objSub instanceof Function){
        objStr = '[Function]'
        color = 'blue'
      }
      else if(objSub instanceof Array){
        objStr = '[object Array]'
      }
      else
        objStr = '[object Object]'

      // set color
      box.options({color})

      // title "──────[object Object]─┤"
      if(!title){
        title = objStr
        title =	Log.col(Log.pad('─', data.pad - box.level - (title.length)-3), 'dim')
          + title
          + Log.col('─┐', 'dim')
      }

      // add title
      if(objStr !== '[Function]')
        box.line(title, 'pre:')

      // build function
      if(objSub instanceof Function){
        const functStr = objSub.toString().replace(/\t/g, '  ').replace(/\r/g, '').split('\n')
        const spacer = (functStr.length+'').length
        const functPad = Math.max(data.pad, Log.getTerminalWidth())

        return functStr.forEach(function(line, i){
          box.line(
            // prefix
            Log.col(i+1,'grey')
            + '─'
            // code & spacer
            + Log.col(
              Log.truncate(line, data.pad - box.level - 4 - spacer)
              + Log.pad(' ', functPad - line.length - box.level - 4 - spacer)
              ,	'code'
            )
            , 'pre:─'+Log.pad('─', spacer - ((i+1)+'').length)
          )
        })
      }
      // no properties found
      else if(!keys.length){
        let emptyStr = '{ empty object }'
        let emptyPad = (data.pad - box.level - emptyStr.length)-3
        let padLeft = Math.floor(emptyPad / 2)
        let padRight = padLeft < emptyPad/2 ? padLeft+1 : padLeft

        emptyStr = Log.col(
          Log.pad('─', padLeft)
          + Log.col(emptyStr, 'bold')
          + Log.pad('─', padRight)
          + (box.level-this.level>1?'┤':'─')
          + Log.col(box.level-this.level>1?'│':'┤', data.colors[0])
          , 'dim')
        box.line(emptyStr, 'pre:')
      }

      // iterate object keys
      keys.forEach((key, iKeys) => {
        let val = objSub[key]

        if(val instanceof Date){
          val = Log.col(val.toISOString(), 'blue')
        }
        // sub object
        else if(val && typeof val === 'object'){
          // build path
          path[box.level+1] = (parseInt(key) == String(key) ? '['+key+']' : '.'+key)

          // title "key────[object Object]─┤"
          let title = Array.isArray(val) ? '[object Array]' : val.toString()
          title = Log.col(key)
            + Log.col(
              Log.pad('─',
                data.pad - (box.level) - colors.stripColor(key).length - colors.stripColor(title).length -5)
              , 'dim')
            +	title
            + Log.col('─┬', 'dim')
            + Log.col('┤', data.colors[0], 'dim')

          return insert.call(this, val, box, title, path)
        }

        // truncate key
        key = Log.truncate(key, data.padKey-box.level-2)

        // prepare
        let valueLines = [val]
        const line = {
          prefix:	[
            key
            + Log.col(Log.pad('·', data.padKey-key.length-box.level)+': ', 'dim')
            , Log.pad(' ', data.padKey-box.level+2)
          ]
        }

        // function
        if(val instanceof Function){
          valueLines = val.toString()
            .replace(/\t/g, '  ')
            .replace(/\r/g, '')
            .split('\n')
        }
        // break value into multiple lines
        else if(typeof val === 'string'){
          valueLines = Log.wrap(val, data.padVal-9).replace(/\r/g, '').split('\n')
        }

        // insert lines
        line.lines = valueLines.length-1
        valueLines.forEach((val, i) => {
          // convert val to string
          val = Log.parseWord(val)

          // build "title···: value │"
          box.line(
            // prefix
            line.prefix[ i < 1 ? 0 : 1 ]
            // value
            +	Log.col(Log.truncate(val, data.padVal-6), 'grey')
            // spacer
            +	Log.pad(' ', data.padVal-colors.stripColor(val).length-6)
            // postfix
            + Log.col(
              // is min 2nd lvl
              (box.level - this.level	> 1
                  // is last of any > lvl1
                  ?
                  (i === valueLines.length-1 && keys[iKeys+1] && objSub[keys[iKeys+1]] !== null && typeof objSub[keys[iKeys+1]] === 'object'
                      ? '↓'
                      : (i === 0 && keys[iKeys-1] && objSub[keys[iKeys-1]] !== null && typeof objSub[keys[iKeys-1]] === 'object'
                        ? '↑'
                        : '│')
                  )
                  : ' '
              ), color, 'dim'
            )
            + Log.col('│', data.colors[0], 'dim')
            , 'pre:'+(line.lines && line.lines === i?'┘':(line.lines && i<1?'┐':(line.lines?'┤':'─')))
          )
        })
      })

      // insert footer
      const footerStr = Log.truncate(path.slice(0, box.level+1).join(''), data.pad - box.level - 11)
        + '─('
        + (keys.length+'')
        + ')─'

      box.line(Log.col(
        Log.pad('─', (data.pad - (box.level) - footerStr.length - 3))
        + footerStr
        + (box.parent && box.parent.level === this.level
            ? Log.col('─┘', 'dim')
            : Log.col('┴', 'dim') + Log.col('┤', data.colors[0], 'dim')
        ), 'dim'), 'pre:')
    }

    // run calculations for layout structure
    compile(obj, this.level)

    // add ": " and level to value
    data.padKey += data.maxLevel
    data.padVal += 2

    // calc needed with
    data.pad = data.padKey + data.padVal

    // set max with
    if(data.pad > data.stdWidth){
      data.pad = data.stdWidth
      if(data.padKey > data.pad){
        data.padKey = Math.round(data.pad * .7)
        data.padVal = Math.round(data.pad * .3)
      } else {
        data.padVal = data.pad - data.padKey
      }
    }

    // insert
    insert.call(this, obj, this)
  }
}

// /**
//  * Truncate string containing ansi color codes
//  * (not in use)
//  *
//  * Source:
//  * http://stackoverflow.com/questions/26238553
//  *
//  * @param {String} str
//  * @param {Number} len
//  * @param {String} [postfix]
//  * @returns {String}
//  */
//Log.truncateAnsi = function(str, len, postfix){
//	// default postfix
//	if(!postfix) postfix = '…'
//
//	// substract postfix from length
//	len -= postfix.length
//
//	if (!len || len < 10) return str; // probably not a valid console -- send back the whole line
//	let count = 0,        // number of visible chars on line so far
//	    esc = false,      // in an escape sequence
//	    longesc = false  // in a multi-character escape sequence
//	let outp = true      // should output this character
//	let arr = str.split('')
//	let res = arr.filter(function(c){ // filter characters...
//		if (esc && !longesc && c == '[') longesc = true // have seen an escape, now '[', start multi-char escape
//		if (c == '\x1b') esc = true // start of escape sequence
//
//		outp = (count < len || esc) // if length exceeded, don't output non-escape chars
//		if (!esc && !longesc) count++ // if not in escape, count visible char
//
//		if (esc && !longesc && c != '\x1b') esc = false // out of single char escape
//		if (longesc && c != '[' && c >= '@' && c <= '~') {esc=false; longesc=false;} // end of multi-char escape
//
//		return outp // result for filter
//	})
//
//	if(arr.length == res.length)
//		return res.join('')
//
//	return res.slice(0, res.length-7).join('') + "\x1b[0m" + postfix
//}

// instance
const log = new Log

module.exports = function(opt){
  // config
  log.options(opt)

  if(log.opt.isWorker){
    log.opt.disableWelcome = true
    log.printedLines = 1
  }
  else if(!log.opt.disableWelcome)
    log.log(log.col(pkg.name, 'rainbow')+' v'+pkg.version+' - Hi mate')

  if(log.opt.override)
    log.overrideConsole()

  return log
}