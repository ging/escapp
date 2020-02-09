const steps = [
    "edit",
    "turnos",
    "puzzles",
    "hints",
    "team",
    "class",
    "evaluation"
];

exports.steps = () => [...steps];

exports.nextStep = (index) => {
    const currentStep = steps.indexOf(index);

    if (currentStep >= steps.length - 1) {
        return "";
    }
    return steps[currentStep + 1];
};

exports.prevStep = (index) => {
    const currentStep = steps.indexOf(index);

    if (currentStep === 0) {
        return false;
    }
    return steps[currentStep - 1];
};
