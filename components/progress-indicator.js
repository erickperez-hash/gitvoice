// ProgressIndicator - Multi-step progress indicator for voice command workflow

class ProgressIndicator {
  constructor() {
    this.steps = ['listening', 'understanding', 'executing', 'complete'];
    this.currentStep = 0;
    this.elements = {};

    this.initializeElements();
  }

  initializeElements() {
    this.steps.forEach((step, index) => {
      this.elements[step] = document.getElementById(`step-${step}`);
    });

    // Get connectors
    this.connectors = document.querySelectorAll('.step-connector');
  }

  reset() {
    this.currentStep = 0;
    this.steps.forEach(step => {
      const el = this.elements[step];
      if (el) {
        el.classList.remove('active', 'complete');
      }
    });

    this.connectors.forEach(connector => {
      connector.classList.remove('active', 'complete');
    });
  }

  setStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > this.steps.length) return;

    this.currentStep = stepNumber;

    this.steps.forEach((step, index) => {
      const el = this.elements[step];
      if (!el) return;

      const stepNum = index + 1;

      if (stepNum === stepNumber) {
        // Current step is active
        el.classList.add('active');
        el.classList.remove('complete');
      } else if (stepNum < stepNumber) {
        // Previous steps are complete
        el.classList.add('complete');
        el.classList.remove('active');
      } else {
        // Future steps are inactive
        el.classList.remove('active', 'complete');
      }
    });

    // Update connectors
    this.connectors.forEach((connector, index) => {
      if (index < stepNumber - 1) {
        connector.classList.add('complete');
        connector.classList.remove('active');
      } else if (index === stepNumber - 1) {
        connector.classList.add('active');
        connector.classList.remove('complete');
      } else {
        connector.classList.remove('active', 'complete');
      }
    });
  }

  completeStep(stepNumber) {
    const stepName = this.steps[stepNumber - 1];
    const el = this.elements[stepName];

    if (el) {
      el.classList.remove('active');
      el.classList.add('complete');
    }

    // Complete the connector before this step
    if (stepNumber > 1 && this.connectors[stepNumber - 2]) {
      this.connectors[stepNumber - 2].classList.add('complete');
      this.connectors[stepNumber - 2].classList.remove('active');
    }

    // If there's a next step, activate its connector
    if (stepNumber < this.steps.length && this.connectors[stepNumber - 1]) {
      this.connectors[stepNumber - 1].classList.add('active');
    }
  }

  setListening() {
    this.setStep(1);
  }

  setUnderstanding() {
    this.completeStep(1);
    this.setStep(2);
  }

  setExecuting() {
    this.completeStep(2);
    this.setStep(3);
  }

  setComplete() {
    this.completeStep(3);
    this.setStep(4);
    this.completeStep(4);
  }

  setError() {
    // Mark current step as error
    const stepName = this.steps[this.currentStep - 1];
    const el = this.elements[stepName];

    if (el) {
      el.classList.add('error');
    }
  }

  getStepName(num) {
    return this.steps[num - 1] || null;
  }

  getCurrentStep() {
    return this.currentStep;
  }
}

// Make available globally
window.ProgressIndicator = ProgressIndicator;
