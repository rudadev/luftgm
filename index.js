const SHOW_FIGURES_DELAY = 200;
const ACTIVATE_FIGURES_DELAY = 500;
const HIDE_FIGURES_DELAY = 2500;
const AUTO_STOP_DELAY = 5 * 1000 * 60;

const SQUARE_FIGURE = document.getElementById("square");
const CIRCLE_FIGURE = document.getElementById("circle");

let gameType = "UNI";

class Game {
  isRunning = false;
  reactions = new Reactions();
  stopwatch = new ReactionTimeStopwatch();
  elements = new ElementsController({
    firstElement: SQUARE_FIGURE,
    secondElement: CIRCLE_FIGURE,
  });
  iteration = new IterationsController();
  delays = {
    show: SHOW_FIGURES_DELAY,
    activate: ACTIVATE_FIGURES_DELAY,
    hide: HIDE_FIGURES_DELAY,
  };

  start() {
    this.isRunning = true;
    this.autoStopAfterTimeout();
    this.updateButtonsUI();
    this.elements.hide();

    this.iterate();
  }

  async iterate() {
    try {
      this.iteration.next();
      const sleep = this.iteration.createSleepWithinCurrentIteration();
      await sleep(this.delays.show);
      this._showElements();
      await sleep(this.delays.activate);
      this._activateElements();
      await sleep(this.delays.hide);
      this._hideElements();
    } catch (error) {
      console.log(error);
    }
  }

  async _showElements() {
    this.elements.show();
    this.iteration.setShowing();
  }

  async _activateElements() {
    this.elements.activate();
    this.iteration.setActive();
    this.stopwatch.recordElementsActivation();
  }

  async _hideElements() {
    if (this.elements.checkCorrectSequence()) this.fail();
    else this.nextIteration();
  }

  nextIteration(preserveState = true) {
    this.elements.hide();
    this.elements.deactivate(preserveState);
    this.stopwatch.reset();
    this.iterate();
  }

  enter() {
    this.stopwatch.recordReactionActivation();

    if (this.iteration.isWaiting() || this.iteration.isShowing())
      return this.fail();

    if (this.elements.checkCorrectSequence()) this.pass();
    else this.fail();
  }

  fail() {
    this.reactions.addFailure();
    this.nextIteration(false);
  }

  pass() {
    const reactionTime = this.stopwatch.calcReactionTime();
    this.reactions.addSuccess();
    this.reactions.recordTime(reactionTime);
    this.nextIteration(false);
  }

  stop() {
    this.isRunning = false;
    this.saveGameData();
    this.iteration.breakCycle();
    this.updateButtonsUI();
    this.elements.deactivate(false);
    this.elements.show();
    gameData.show();
  }

  updateButtonsUI() {
    ButtonsController.toggleDisabledStartStopButtons();
    ButtonsController.toggleDisabledEnterButton();
  }

  saveGameData() {
    const points = this.calcPoints();
    gameData.update({
      failures: this.reactions.failures,
      successes: this.reactions.successes,
      iterations: this.iteration.id,
      reactionTimes: this.reactions.times,
      points,
      winner: points <= 450,
    });
  }

  calcPoints() {
    const offPoints = this.reactions.failures * 50;
    return this.reactions.calcAvarageReactionTime() + offPoints;
  }

  autoStopAfterTimeout() {
    setTimeout(() => this.stop(), AUTO_STOP_DELAY);
  }
}

class Reactions {
  failures = 0;
  successes = 0;
  times = [];

  addFailure() {
    this.failures++;
  }

  addSuccess() {
    this.successes++;
  }

  recordTime(time) {
    this.times.push(time);
  }

  calcAvarageReactionTime() {
    const totalTimesCount = this.times.length;
    const timesSum = this.times.reduce((p, n) => p + n, 0);
    return timesSum / totalTimesCount;
  }
}

class ReactionTimeStopwatch {
  elementsActivationTime;
  reactionActivationTime;

  recordElementsActivation() {
    this.elementsActivationTime = Date.now();
  }

  recordReactionActivation() {
    this.reactionActivationTime = Date.now();
  }

  calcReactionTime() {
    return this.reactionActivationTime - this.elementsActivationTime;
  }

  reset() {
    this.elementsActivationTime = null;
    this.enterButtonActivationTime = null;
  }
}

class ButtonsController {
  static startButton = document.getElementById("start-btn");
  static gameTypeCheck = document.getElementById("game-type");
  static gameTypeLabel = document.getElementById("game-type-label");
  static enterButton = document.getElementById("green-btn");
  static enterKeys = ["Enter", " "];

  static toggleDisabledStartStopButtons() {
    const disabled = this.startButton.disabled;
    this.startButton.disabled = !disabled;
    this.gameTypeCheck.disabled = !disabled;
  }

  static toggleDisabledEnterButton() {
    this.enterButton.disabled = !this.enterButton.disabled;
  }

  static onStartClick(callback) {
    this.startButton.onclick = callback;
  }

  static onGameTypeChanges(callback) {
    this.gameTypeCheck.onchange = callback;
  }

  static updateGameTypeLabel(label) {
    this.gameTypeLabel.innerText = label;
  }

  static onEnterClick(callback) {
    this.enterButton.onclick = callback;
    document.addEventListener("keydown", (event) => {
      if (this.enterKeys.includes(event.key)) callback();
    });
  }
}

class ElementsController {
  first;
  second;

  constructor(elements) {
    this.first = new SingleElementController(elements.firstElement);
    this.second = new SingleElementController(elements.secondElement);
  }

  hide() {
    this.first.hide();
    this.second.hide();
  }

  show() {
    this.first.show();
    this.second.show();
  }

  activate() {
    this.first.nextState();
    this.second.nextState();
    this.first.activate();
    this.second.activate();
  }

  deactivate(preserveState) {
    this.first.deactivate(preserveState);
    this.second.deactivate(preserveState);
  }

  checkCorrectSequence() {
    return this.first.areBothActive() || this.second.areBothActive();
  }
}

class SingleElementController {
  reference;
  lastState;
  currentState;

  constructor(reference) {
    this.reference = reference;
  }

  hide() {
    this.reference.classList.add("hidden");
  }

  show() {
    this.reference.classList.remove("hidden");
  }

  nextState() {
    this.currentState = ElementsState.generateRandomState();
  }

  activate() {
    if (this.isCurrentActive()) this.reference.classList.add("active");
  }

  deactivate(preserveLastState) {
    this.reference.classList.remove("active");
    this.lastState = preserveLastState ? this.currentState : null;
    this.currentState = null;
  }

  isCurrentActive() {
    return this.currentState === ElementsState.ACTIVE;
  }

  areBothActive() {
    return this.lastState === this.currentState && this.isCurrentActive();
  }
}

class ElementsState {
  static ACTIVE = 0;
  static STATIC = 1;

  static generateRandomState() {
    const middleDecision = Math.random() < 0.5;
    return middleDecision ? this.ACTIVE : this.STATIC;
  }
}

class IterationsController {
  id = -1;
  state;

  next() {
    this.id++;
    this.state = IterationState.WAITING;
  }

  breakCycle() {
    this.id = -1;
  }

  setShowing() {
    this.state = IterationState.SHOWING;
  }

  isShowing() {
    return this.state === IterationState.SHOWING;
  }

  setActive() {
    this.state = IterationState.ACTIVE;
  }

  isActive() {
    return this.state === IterationState.ACTIVE;
  }

  setWaiting() {
    this.state = IterationState.WAITING;
  }

  isWaiting() {
    return this.state === IterationState.WAITING;
  }

  createSleepWithinCurrentIteration() {
    let sleepingId = this.id;
    return (ms) =>
      new Promise((resolve, reject) =>
        setTimeout(
          () =>
            this.id === sleepingId
              ? resolve()
              : reject(new Error("Iteration didn't resolve from sleep")),
          ms
        )
      );
  }
}
class IterationState {
  static WAITING = 0;
  static SHOWING = 1;
  static ACTIVE = 2;
}

class GameData {
  static dataElement = document.documentElement;
  data = {};

  update(newData) {
    this.data = newData;
  }

  show() {
    GameData.dataElement.innerHTML = JSON.stringify(this.data);
  }
}
let gameData = new GameData();
let game;

const init = () => {
  ButtonsController.onStartClick(() => {
    game = new Game();
    game.start();
  });

  ButtonsController.onGameTypeChanges((event) => {
    const { checked } = event.target;
    if (checked) gameType = "CROSS";
    else gameType = "UNI";
    ButtonsController.updateGameTypeLabel(gameType);
  });

  ButtonsController.onEnterClick(() => {
    game.enter();
  });
};

document.addEventListener("DOMContentLoaded", init);
