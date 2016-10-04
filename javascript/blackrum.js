var ui = new InterpreterUI();

$(document).ready(function () {
    $("#btn-start").click(function (event) {
        event.preventDefault();
        ui.start();
    });
    $("#btn-pause").click(function (event) {
        event.preventDefault();
        ui.pause();
    });
    $("#btn-step").click(function (event) {
        event.preventDefault();
        ui.step();
    });
    $("#btn-stop").click(function (event) {
        event.preventDefault();
        ui.stop();
    });
    $("#btn-optimize").click(function (event) {
        event.preventDefault();
        $('#program').val(optimize($('#program').val()));
    });
    resizePanels();
})

$(window).resize(function (event) {
    resizePanels();
});

function resizePanels() {
    var height = $(window).height() + 30;

    $('#program').css('height', 0);
    $('#input').css('height', 0);
    $('#memory').css('height', 0);
    $('#output').css('height', 0);

    height -= ($('#button-bar').height() +
               $('#panels-body').height());

    $('#program').css('height', height * .3);
    $('#input').css('height', height * .3);
    $('#memory').css('height', height * .7);
    $('#output').css('height', height * .7);
}

function optimize(program) {
    /* remove invalid ops: */
    var valid_op = function(op) {
        return 'mpbnocir'.indexOf(op) > -1;
    }

    program = program.split('').filter(valid_op).join('');

    return program;
}

function zeropad(string, length) {
    while(string.length < length) {
        string = '0' + string;
    }

    return string;
}

function renderMemory(memory, current, size) {
    var ret = '';

    for (var row = 0; (row * 8) < size; ++row) {
        ret += zeropad((row * 8).toString(16), 6) + ' ';
        for (var column = 0;
             column < 8 && (row * 8 + column) < size;
             ++column) {
            var index = row * 8 + column,
                prefix = index == current ? '*' : ' ';
            ret += prefix + zeropad(memory[index].toString(16), 2) + ' ';
        }
        ret += '\n';
    }

    return ret;
}

function InterpreterUI() {
    this.interpreter = undefined;
    this.state = new UIStopped();
}

InterpreterUI.prototype.start = function() {
    this.state = this.state.start();
}

InterpreterUI.prototype.pause = function() {
    this.state = this.state.pause();
}

InterpreterUI.prototype.step = function() {
    this.state = this.state.step() || this.state;
}

InterpreterUI.prototype.stop = function() {
    this.state = this.state.stop();
}

InterpreterUI.prototype.onStart = function() {
    var self = this;

    $('#output').val('');

    $("#btn-optimize").addClass('disabled');

    $('#cycles-count').html('0');
    $('#running-time').html("0.00 seconds");
    $('#result').removeClass('label-danger')
                .removeClass('label-success')
                .addClass('label-default');
    $('#result').html("N/A");

    this.interpreter = new Interpreter(
        $('#program').val(),
        $("#input").val(),
        function() {
            self.onTick()
        },
        function(err) {
            self.onFinish(err);
        }
    );
}

InterpreterUI.prototype.onTick = function () {
    var self = this;

    delta = (Date.now() - this.interpreter.start_date) / 1000;

    $('#program').get(0).setSelectionRange(this.interpreter.pc,
                                           this.interpreter.pc+1);

    $('#memory').html(renderMemory(this.interpreter.memory,
                                   this.interpreter.mem_ptr,
                                   this.interpreter.mem_size));
    $('#output').val(this.interpreter.output);
    $('#program-counter').html(this.interpreter.pc);
    $('#program-opcode').html(this.interpreter.program[this.interpreter.pc]);
    $('#memory-ptr').html(this.interpreter.mem_ptr);
    $('#memory-size').html(this.interpreter.mem_size);
    $('#memory-value').html((function () {
        var value = self.interpreter.memory[self.interpreter.mem_ptr];
        return "0x" + zeropad(value.toString(16), 2) + " (" + value + ")";
    })());
    $('#input-ptr').html(this.interpreter.input_ptr);
    $('#input-value').html(
        "'" + this.interpreter.input[this.interpreter.input_ptr] + "'"
    );
    $('#cycles-count').html(this.interpreter.cycles);
    $('#running-time').html(delta.toFixed(2) + " seconds");
}

InterpreterUI.prototype.onFinish = function (result) {
    $('#btn-start').removeClass("disabled");
    $('#btn-start-label').html("Start");
    $('#btn-pause').addClass("disabled");
    $('#btn-step').removeClass("disabled");
    $('#btn-stop').addClass("disabled");
    $("#btn-optimize").removeClass("disabled");

    $('#result').removeClass('label-default');
    $('#result').addClass(result.error
                            ? 'label-danger'
                            : 'label-success');
    $('#result').html(result.msg);

    this.state = new UIStopped();
}

function UIStopped() {}

UIStopped.prototype.start = function() {
    ui.onStart();
    ui.interpreter.start(parseInt($('#inst-per-cycle').val()),
                         parseInt($('#cycle-delay').val()));

    $('#btn-start').addClass("disabled");
    $('#btn-pause').removeClass("disabled");
    $('#btn-step').addClass("disabled");
    $('#btn-stop').removeClass("disabled");

    return new UIRunning();
}

UIStopped.prototype.pause = function() {
    throw "Invalid transition";
}

UIStopped.prototype.step = function() {
    ui.onStart();
    ui.interpreter.step($('#program').val(),
                        $('#input').val());

    $('#btn-start').removeClass("disabled");
    $('#btn-start-label').html("Resume");
    $('#btn-pause').addClass("disabled");
    $('#btn-step').removeClass("disabled");
    $('#btn-stop').removeClass("disabled");

    return new UIPaused();
}

UIStopped.prototype.stop = function() {
    throw "Invalid transition";
}

function UIRunning() {}

UIRunning.prototype.start = function() {
    throw "Invalid transition";
}

UIRunning.prototype.pause = function() {
    ui.interpreter.pause();

    $('#btn-start').removeClass("disabled");
    $('#btn-start-label').html("Resume");
    $('#btn-pause').addClass("disabled");
    $('#btn-step').removeClass("disabled");
    $('#btn-stop').removeClass("disabled");

    return new UIPaused();
}

UIRunning.prototype.step = function() {
    throw "Invalid transition";
}

UIRunning.prototype.stop = function() {
    ui.interpreter.stop();
    return new UIStopped();
}

function UIPaused() {}

UIPaused.prototype.start = function () {
    ui.interpreter.start(parseInt($('#inst-per-cycle').val()),
                         parseInt($('#cycle-delay').val()));

    $('#btn-start').addClass("disabled");
    $('#btn-pause').removeClass("disabled");
    $('#btn-step').addClass("disabled");
    $('#btn-stop').removeClass("disabled");

    return new UIRunning();
}

UIPaused.prototype.pause = function () {
    throw "Invalid transition";
}

UIPaused.prototype.step = function () {
    ui.interpreter.step($('#program').val(),
                        $('#input').val());
    return undefined;
}

UIPaused.prototype.stop = function () {
    ui.interpreter.stop();
    return new UIStopped();
}

////////////
function Interpreter(program, input, onTick, onFinish) {
    this.load(program, input);

    this.onTick = onTick;
    this.onFinish = onFinish;

    this.stopRequested = false;
    this.intervalId = undefined;

    this.start_date = Date.now();
    this.cycles = 0;

    this.memory = {0: 0};
    this.mem_ptr = 0;
    this.mem_size = 1;
    this.input_ptr = 0;
    this.pc = 0;
    this.output = '';

    this.state = new Stopped(this);
}

Interpreter.prototype.load = function(program, input) {
    this.program = program;
    this.input = input;

    this.jumps = {};

    /* precompute jumps: */
    for(var pc = 0, stack = []; pc < this.program.length; ++pc) {
        var opcode = this.program[pc];

        if (opcode == 'o') {
            stack.push(pc);
        } else if (opcode == 'c') {
            var target = stack.pop();
            this.jumps[target] = pc;
            this.jumps[pc] = target;
        }
    }
}

function ErrorResult (msg) {
    this.error = true;
    this.msg = msg;
}

function SucessResult (msg) {
    this.error = false;
    this.msg = msg;
}

Interpreter.prototype.runCycle = function(instPerCycle) {
    try {
        for(var i = 0;
            i < instPerCycle && this.pc < this.program.length;
            ++i) {
            var opcode = this.program[this.pc];
            switch(opcode) {
                case 'n':
                    if(++this.mem_ptr == this.mem_size) {
                        this.memory[this.mem_ptr] = 0;
                        ++this.mem_size;
                    }
                    break;
                case 'b':
                    if(--this.mem_ptr < 0) {
                        throw new ErrorResult("OOB");
                    }
                    break;
                case 'p':
                    if(++this.memory[this.mem_ptr] > 0xff) {
                        this.memory[this.mem_ptr] = 0;
                    }
                    break;
                case 'm':
                    if(--this.memory[this.mem_ptr] < 0) {
                        throw new ErrorResult("NEG");
                    }
                    break;
                case 'r':
                    this.output += String.fromCharCode(this.memory[this.mem_ptr]);
                    break;
                case 'i':
                    if (this.input_ptr < this.input.length) {
                        this.memory[this.mem_ptr] =
                            this.input.charCodeAt(this.input_ptr++);
                    } else {
                        throw new SucessResult("EOF");
                    }
                    break;
                case 'o':
                    if (this.memory[this.mem_ptr] == 0) {
                        this.pc = this.jumps[this.pc];
                    }
                    if (this.pc == undefined) {
                        throw new ErrorResult("MISMATCH");
                    }
                    break;
                case 'c':
                    if (this.memory[this.mem_ptr] != 0) {
                        this.pc = this.jumps[this.pc];
                    }
                    if (this.pc == undefined) {
                        throw new ErrorResult("MISMATCH");
                    }
                    break;
                default:
                    break;
            }
            ++this.pc;
        }

        this.cycles += 1;

        if (this.pc == this.program.length) {
            throw new SucessResult("EOP");
        }

        if (this.stopRequested) {
            throw new SucessResult("STOP");
        }

        this.onTick(this);
    } catch(r) {
        console.log("Result: ", r);
        this.onTick();
        this.finish(r);
    }
}

Interpreter.prototype.start = function (instPerCycle, cycleDelay) {
    this.state = this.state.start(instPerCycle, cycleDelay);
}

Interpreter.prototype.pause = function () {
    this.state = this.state.pause();
}

Interpreter.prototype.step = function (program, input) {
    this.state = this.state.step(program, input) || this.state;
}

Interpreter.prototype.stop = function () {
    this.state = this.state.stop();
}

Interpreter.prototype.finish = function (e) {
    clearInterval(this.intervalId);
    this.state = new Stopped(this);
    this.onFinish(e, this);
}

////
function Stopped(interpreter) {
    this.interpreter = interpreter;
}

Stopped.prototype.start = function (instPerCycle, cycleDelay) {
    var self = this;

    this.interpreter.intervalId = setInterval(function () {
        self.interpreter.runCycle(instPerCycle);
    }, cycleDelay);

    return new Running(this.interpreter);
}

Stopped.prototype.pause = function () {
    throw "Invalid transition";
}

Stopped.prototype.step = function (program, input) {
    this.interpreter.load(program, input);
    this.interpreter.runCycle(1);
    return new Paused(this.interpreter);
}

Stopped.prototype.stop = function () {
    throw "Invalid transition";
}

////
function Running(interpreter) {
    this.interpreter = interpreter;
}

Running.prototype.start = function () {
    throw "Invalid transition";
}

Running.prototype.pause = function () {
    clearInterval(this.interpreter.intervalId);
    return new Paused(this.interpreter);
}

Running.prototype.step = function () {
    throw "Invalid transition";
}

Running.prototype.stop = function () {
    this.interpreter.stopRequested = true;
    return new Stopped(this.interpreter);
}

////
function Paused(interpreter) {
    this.interpreter = interpreter;
}

Paused.prototype.start = function (instPerCycle, cycleDelay) {
    var self = this;

    this.interpreter.intervalId = setInterval(function () {
        self.interpreter.runCycle(instPerCycle);
    }, cycleDelay);

    return new Running(this.interpreter);
}

Paused.prototype.paused = function () {
    throw "Invalid transition";
}

Paused.prototype.step = function (program, input) {
    this.interpreter.load(program, input);
    this.interpreter.runCycle(1);
    return undefined;
}

Paused.prototype.stop = function () {
    this.interpreter.finish(new SucessResult("STOP"));
    return new Stopped(this.interpreter);
}
