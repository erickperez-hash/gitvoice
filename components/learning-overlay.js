// LearningOverlay - Command explanation overlay for educational purposes

class LearningOverlay {
  constructor() {
    this.overlay = null;
    this.isVisible = false;
    this.currentTopic = null;
    this.createOverlay();
  }

  createOverlay() {
    // Create overlay element if it doesn't exist
    this.overlay = document.getElementById('learning-overlay');
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.id = 'learning-overlay';
      this.overlay.className = 'learning-overlay hidden';
      this.overlay.innerHTML = this.getTemplate();
      document.body.appendChild(this.overlay);
      this.bindEvents();
    }
  }

  getTemplate() {
    return `
      <div class="overlay-backdrop"></div>
      <div class="overlay-content">
        <div class="overlay-header">
          <h2><span class="overlay-icon">📖</span> <span id="overlay-title">Learning</span></h2>
          <button class="close-overlay" id="close-overlay">&times;</button>
        </div>

        <div class="overlay-body">
          <!-- Topic Navigation -->
          <div class="topic-nav">
            <button class="topic-btn active" data-topic="basics">Git Basics</button>
            <button class="topic-btn" data-topic="branching">Branching</button>
            <button class="topic-btn" data-topic="remote">Remote Repos</button>
            <button class="topic-btn" data-topic="workflow">Workflow</button>
          </div>

          <!-- Content Area -->
          <div class="topic-content" id="topic-content">
            <!-- Content loaded dynamically -->
          </div>

          <!-- Interactive Examples -->
          <div class="interactive-section">
            <h3>Try It Yourself</h3>
            <div class="example-command">
              <code id="example-command"></code>
              <button id="try-example" class="btn btn-primary btn-small">Try This Command</button>
            </div>
          </div>

          <!-- Quiz Section -->
          <div class="quiz-section" id="quiz-section" style="display: none;">
            <h3>Quick Quiz</h3>
            <p id="quiz-question"></p>
            <div id="quiz-options"></div>
            <div id="quiz-result"></div>
          </div>
        </div>

        <div class="overlay-footer">
          <button id="prev-topic" class="btn btn-secondary">← Previous</button>
          <button id="show-quiz" class="btn btn-secondary">Take Quiz</button>
          <button id="next-topic" class="btn btn-primary">Next →</button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Close button
    this.overlay.querySelector('#close-overlay')?.addEventListener('click', () => this.hide());
    this.overlay.querySelector('.overlay-backdrop')?.addEventListener('click', () => this.hide());

    // Topic navigation
    this.overlay.querySelectorAll('.topic-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.overlay.querySelectorAll('.topic-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.showTopic(e.target.dataset.topic);
      });
    });

    // Navigation buttons
    this.overlay.querySelector('#prev-topic')?.addEventListener('click', () => this.previousTopic());
    this.overlay.querySelector('#next-topic')?.addEventListener('click', () => this.nextTopic());
    this.overlay.querySelector('#show-quiz')?.addEventListener('click', () => this.showQuiz());

    // Try example button
    this.overlay.querySelector('#try-example')?.addEventListener('click', () => this.tryExample());

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  show(topic = 'basics') {
    this.currentTopic = topic;
    this.showTopic(topic);
    this.overlay.classList.remove('hidden');
    this.isVisible = true;
  }

  hide() {
    this.overlay.classList.add('hidden');
    this.isVisible = false;
  }

  showTopic(topic) {
    this.currentTopic = topic;
    const content = this.getTopicContent(topic);
    const contentEl = this.overlay.querySelector('#topic-content');
    const titleEl = this.overlay.querySelector('#overlay-title');
    const exampleEl = this.overlay.querySelector('#example-command');

    if (contentEl) {
      contentEl.innerHTML = content.html;
    }
    if (titleEl) {
      titleEl.textContent = content.title;
    }
    if (exampleEl) {
      exampleEl.textContent = content.example;
    }

    // Update active button
    this.overlay.querySelectorAll('.topic-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.topic === topic);
    });

    // Hide quiz when changing topics
    const quizSection = this.overlay.querySelector('#quiz-section');
    if (quizSection) {
      quizSection.style.display = 'none';
    }
  }

  getTopicContent(topic) {
    const topics = {
      basics: {
        title: 'Git Basics',
        html: `
          <div class="learning-content">
            <h3>What is Git?</h3>
            <p>Git is a <strong>version control system</strong> that tracks changes in your code over time. Think of it as an unlimited undo/redo system for your entire project.</p>

            <h3>Key Concepts</h3>
            <div class="concept-grid">
              <div class="concept-card">
                <h4>Repository (Repo)</h4>
                <p>A folder that Git is tracking. Contains all your files and their complete history.</p>
              </div>
              <div class="concept-card">
                <h4>Commit</h4>
                <p>A snapshot of your project at a specific point in time. Like a save point in a video game.</p>
              </div>
              <div class="concept-card">
                <h4>Staging Area</h4>
                <p>A preparation area where you select which changes to include in your next commit.</p>
              </div>
              <div class="concept-card">
                <h4>Working Directory</h4>
                <p>Your actual files on disk. Where you make changes before staging them.</p>
              </div>
            </div>

            <h3>The Basic Workflow</h3>
            <ol class="workflow-steps">
              <li><strong>Edit</strong> - Make changes to your files</li>
              <li><strong>Stage</strong> - Select changes with <code>git add</code></li>
              <li><strong>Commit</strong> - Save snapshot with <code>git commit</code></li>
              <li><strong>Repeat</strong> - Continue developing</li>
            </ol>
          </div>
        `,
        example: 'git status'
      },

      branching: {
        title: 'Branching & Merging',
        html: `
          <div class="learning-content">
            <h3>What are Branches?</h3>
            <p>Branches let you work on different features <strong>independently</strong>. Think of them as parallel timelines for your code.</p>

            <h3>Why Use Branches?</h3>
            <ul class="benefits-list">
              <li>Keep your main code stable while experimenting</li>
              <li>Work on multiple features simultaneously</li>
              <li>Collaborate without stepping on each other's toes</li>
              <li>Easily discard failed experiments</li>
            </ul>

            <h3>Common Branch Commands</h3>
            <div class="command-list">
              <div class="command-item">
                <code>git branch</code>
                <p>List all branches</p>
              </div>
              <div class="command-item">
                <code>git branch feature-name</code>
                <p>Create a new branch</p>
              </div>
              <div class="command-item">
                <code>git checkout feature-name</code>
                <p>Switch to a branch</p>
              </div>
              <div class="command-item">
                <code>git merge feature-name</code>
                <p>Merge a branch into current branch</p>
              </div>
            </div>

            <h3>Best Practices</h3>
            <ul>
              <li>Keep <code>main</code> branch stable and deployable</li>
              <li>Create branches for each feature or bug fix</li>
              <li>Use descriptive branch names: <code>feature/login</code>, <code>fix/header-bug</code></li>
              <li>Delete branches after merging</li>
            </ul>
          </div>
        `,
        example: 'git branch'
      },

      remote: {
        title: 'Remote Repositories',
        html: `
          <div class="learning-content">
            <h3>What are Remotes?</h3>
            <p>Remote repositories are versions of your project hosted on the internet (like GitHub, GitLab). They enable <strong>collaboration</strong> and <strong>backup</strong>.</p>

            <h3>Key Remote Concepts</h3>
            <div class="concept-grid">
              <div class="concept-card">
                <h4>Origin</h4>
                <p>The default name for the remote you cloned from. Usually points to GitHub.</p>
              </div>
              <div class="concept-card">
                <h4>Push</h4>
                <p>Upload your local commits to the remote repository.</p>
              </div>
              <div class="concept-card">
                <h4>Pull</h4>
                <p>Download commits from remote and merge them into your local branch.</p>
              </div>
              <div class="concept-card">
                <h4>Fetch</h4>
                <p>Download commits from remote without merging (just to see what's new).</p>
              </div>
            </div>

            <h3>Common Remote Commands</h3>
            <div class="command-list">
              <div class="command-item">
                <code>git remote -v</code>
                <p>Show configured remotes</p>
              </div>
              <div class="command-item">
                <code>git push origin main</code>
                <p>Push commits to remote</p>
              </div>
              <div class="command-item">
                <code>git pull origin main</code>
                <p>Pull and merge from remote</p>
              </div>
              <div class="command-item">
                <code>git clone URL</code>
                <p>Download a repository</p>
              </div>
            </div>

            <h3>Push/Pull Workflow</h3>
            <ol class="workflow-steps">
              <li><strong>Pull</strong> - Get latest changes first</li>
              <li><strong>Work</strong> - Make your changes locally</li>
              <li><strong>Commit</strong> - Save your work</li>
              <li><strong>Push</strong> - Share with team</li>
            </ol>
          </div>
        `,
        example: 'git remote -v'
      },

      workflow: {
        title: 'Git Workflow',
        html: `
          <div class="learning-content">
            <h3>Recommended Daily Workflow</h3>
            <div class="workflow-diagram">
              <div class="workflow-step">
                <span class="step-num">1</span>
                <strong>Start Your Day</strong>
                <code>git pull</code>
                <p>Get the latest changes from your team</p>
              </div>
              <div class="workflow-step">
                <span class="step-num">2</span>
                <strong>Create a Branch</strong>
                <code>git checkout -b feature/my-feature</code>
                <p>Work in isolation</p>
              </div>
              <div class="workflow-step">
                <span class="step-num">3</span>
                <strong>Make Changes</strong>
                <code>git status</code>
                <p>Check what you've changed frequently</p>
              </div>
              <div class="workflow-step">
                <span class="step-num">4</span>
                <strong>Stage & Commit</strong>
                <code>git add . && git commit -m "message"</code>
                <p>Save your progress often</p>
              </div>
              <div class="workflow-step">
                <span class="step-num">5</span>
                <strong>Push & Share</strong>
                <code>git push origin feature/my-feature</code>
                <p>Back up your work</p>
              </div>
            </div>

            <h3>Commit Message Guidelines</h3>
            <div class="guidelines">
              <div class="good-example">
                <h4>✓ Good Messages</h4>
                <ul>
                  <li>"Add user authentication"</li>
                  <li>"Fix login button alignment"</li>
                  <li>"Update README with setup instructions"</li>
                </ul>
              </div>
              <div class="bad-example">
                <h4>✗ Bad Messages</h4>
                <ul>
                  <li>"Fixed stuff"</li>
                  <li>"Updates"</li>
                  <li>"WIP"</li>
                </ul>
              </div>
            </div>

            <h3>Golden Rules</h3>
            <ul class="golden-rules">
              <li>🔄 <strong>Pull before you push</strong> - Avoid conflicts</li>
              <li>💾 <strong>Commit early, commit often</strong> - Small, focused commits</li>
              <li>🌿 <strong>Branch for features</strong> - Keep main stable</li>
              <li>📝 <strong>Write good messages</strong> - Future you will thank you</li>
              <li>👀 <strong>Review before committing</strong> - Use git diff</li>
            </ul>
          </div>
        `,
        example: 'git log --oneline -5'
      }
    };

    return topics[topic] || topics.basics;
  }

  previousTopic() {
    const topicOrder = ['basics', 'branching', 'remote', 'workflow'];
    const currentIndex = topicOrder.indexOf(this.currentTopic);
    if (currentIndex > 0) {
      this.showTopic(topicOrder[currentIndex - 1]);
    }
  }

  nextTopic() {
    const topicOrder = ['basics', 'branching', 'remote', 'workflow'];
    const currentIndex = topicOrder.indexOf(this.currentTopic);
    if (currentIndex < topicOrder.length - 1) {
      this.showTopic(topicOrder[currentIndex + 1]);
    }
  }

  tryExample() {
    const exampleEl = this.overlay.querySelector('#example-command');
    if (exampleEl && window.gitService) {
      const command = exampleEl.textContent;
      // Trigger the command through the main app
      if (window.executeVoiceCommand) {
        this.hide();
        window.executeVoiceCommand(command);
      }
    }
  }

  showQuiz() {
    const quizSection = this.overlay.querySelector('#quiz-section');
    if (quizSection) {
      quizSection.style.display = 'block';
      this.loadQuiz(this.currentTopic);
    }
  }

  loadQuiz(topic) {
    const questionPool = {
      basics: [
        {
          question: 'What command shows the current state of your working directory?',
          options: ['git status', 'git log', 'git show', 'git diff'],
          correct: 'git status'
        },
        {
          question: 'What is a "commit" in Git?',
          options: ['A snapshot of your project', 'A way to delete files', 'A remote server', 'A branch name'],
          correct: 'A snapshot of your project'
        },
        {
          question: 'Which area is used to prepare changes for a commit?',
          options: ['Staging Area', 'Working Directory', 'Remote Repository', 'The Trash'],
          correct: 'Staging Area'
        }
      ],
      branching: [
        {
          question: 'What command creates a new branch called "feature"?',
          options: ['git branch feature', 'git new feature', 'git create feature', 'git make feature'],
          correct: 'git branch feature'
        },
        {
          question: 'How do you switch from "main" to a branch called "dev"?',
          options: ['git checkout dev', 'git switch-to dev', 'git move dev', 'git goto dev'],
          correct: 'git checkout dev'
        },
        {
          question: 'What does "merging" do?',
          options: ['Integrates changes from one branch into another', 'Deletes a branch', 'Renames a file', 'Uploads to GitHub'],
          correct: 'Integrates changes from one branch into another'
        }
      ],
      remote: [
        {
          question: 'What does "git push" do?',
          options: ['Uploads local commits to remote', 'Downloads changes from remote', 'Creates a new branch', 'Shows commit history'],
          correct: 'Uploads local commits to remote'
        },
        {
          question: 'What is "origin" in Git?',
          options: ['The default name for your remote repository', 'The very first commit', 'Your local computer', 'A set of ignored files'],
          correct: 'The default name for your remote repository'
        },
        {
          question: 'Which command downloads changes from remote without merging them?',
          options: ['git fetch', 'git pull', 'git download', 'git sync'],
          correct: 'git fetch'
        }
      ],
      workflow: [
        {
          question: 'What should you do before pushing your changes?',
          options: ['Pull latest changes', 'Delete branches', 'Clear the cache', 'Restart Git'],
          correct: 'Pull latest changes'
        },
        {
          question: 'What makes a good commit message?',
          options: ['Descriptive and concise', 'Long and detailed', 'Just a date', 'Random characters'],
          correct: 'Descriptive and concise'
        },
        {
          question: 'What is the "Golden Rule" of Git?',
          options: ['Pull before you push', 'Always work on main', 'Never use branches', 'Commit once a week'],
          correct: 'Pull before you push'
        }
      ]
    };

    const pool = questionPool[topic] || questionPool.basics;
    const quiz = pool[Math.floor(Math.random() * pool.length)];

    // Shuffle options
    const shuffledOptions = [...quiz.options].sort(() => Math.random() - 0.5);
    const correctIndex = shuffledOptions.indexOf(quiz.correct);

    const questionEl = this.overlay.querySelector('#quiz-question');
    const optionsEl = this.overlay.querySelector('#quiz-options');
    const resultEl = this.overlay.querySelector('#quiz-result');

    if (questionEl) questionEl.textContent = quiz.question;
    if (resultEl) resultEl.innerHTML = '';

    if (optionsEl) {
      optionsEl.innerHTML = shuffledOptions.map((opt, i) => `
        <button class="quiz-option" data-index="${i}">${opt}</button>
      `).join('');

      optionsEl.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const selected = parseInt(e.target.dataset.index);
          this.checkAnswer(selected, correctIndex);
        });
      });
    }
  }

  checkAnswer(selected, correct) {
    const resultEl = this.overlay.querySelector('#quiz-result');
    const optionBtns = this.overlay.querySelectorAll('.quiz-option');

    optionBtns.forEach((btn, i) => {
      btn.disabled = true;
      if (i === correct) {
        btn.classList.add('correct');
      } else if (i === selected && selected !== correct) {
        btn.classList.add('incorrect');
      }
    });

    if (resultEl) {
      if (selected === correct) {
        resultEl.innerHTML = '<span class="quiz-correct">✓ Correct! Great job!</span>';
      } else {
        resultEl.innerHTML = '<span class="quiz-incorrect">✗ Not quite. The correct answer is highlighted.</span>';
      }
    }
  }
}

// Make available globally
window.LearningOverlay = LearningOverlay;
