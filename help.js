require('./')();

// log a string
console.log("They're minerals! Jesus Christ, Marie.");
// as you know and love it, native methods are fully supported

// start a timer
console.time('TimerTim');

// build a box
var box = console.box('I am a child.');

// add a line to our new box
box.line('I am the 2nd line of the sub box!');

// print the box - always required when using boxes
box.out();

// print timer
console.time('TimerTim');

// make noise
console.beep();
return;
// display help
return console.help();