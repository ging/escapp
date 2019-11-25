const steps = [
    "edit",
    "turnos",
    "puzzles",
    "hints",
    "assets",
    "instructions",
    "appearance",
    "evaluation"
];
exports.steps = ()=> [...steps];

exports.nextStep = (index) => {
    const currentStep = steps.indexOf(index);
    console.log(index, steps, currentStep)
    if (currentStep >= steps.length - 1) {
        return "";
    } else {
        return steps[currentStep + 1];
    }
};

exports.prevStep = (index) => {
    const currentStep = steps.indexOf(index);
    if (currentStep === 0) {
        return false;
    } else {
        return steps[currentStep - 1];
    }
};