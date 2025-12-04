
const STORAGE_KEY = 'mytodo.tasks.v1';

const form = document.querySelector('#todoForm');
const titleInput = document.querySelector('#title');
const priorityInput = document.querySelector('#priority');
const remindInput = document.querySelector('#remind');
const titleError = document.querySelector('#titleError');

const taskList = document.querySelector('#taskList');
const counterEl = document.querySelector('#counter');

const filterButtons = document.querySelectorAll('.filter-btn');
const toggleCompletedBtn = document.querySelector('#toggleCompleted');
const clearCompletedBtn = document.querySelector('#clearCompleted');
const clearAllBtn = document.querySelector('#clearAll');
const saveManualBtn = document.querySelector('#saveManual');

let tasks = loadTasks();           
let currentFilter = 'all';
let hideCompleted = false;

render();


form.addEventListener('submit', (e) => {
  e.preventDefault();
  clearValidation();

  const title = titleInput.value.trim();
  const priority = priorityInput.value;
  const remind = remindInput.checked;

  
  if (!title) {
    showValidationError('title', 'Tehtävä ei saa olla tyhjä.');
    return;
  }
  if (title.length < 3) {
    showValidationError('title', 'Tehtävän tulee olla vähintään 3 merkkiä.');
    return;
  }

  const task = {
    id: generateId(),
    title,
    priority,
    remind,
    done: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(task);
  saveTasks();
  render();
  form.reset();
  titleInput.focus();
});


filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});


toggleCompletedBtn.addEventListener('click', () => {
  hideCompleted = !hideCompleted;
  toggleCompletedBtn.textContent = hideCompleted ? 'Näytä tehdyt' : 'Piilota tehdyt';
  render();
});

clearCompletedBtn.addEventListener('click', () => {
  if (!confirm('Poistetaanko kaikki tehdyt tehtävät?')) return;
  tasks = tasks.filter(t => !t.done);
  saveTasks();
  render();
});

clearAllBtn.addEventListener('click', () => {
  if (!confirm('Poistetaanko kaikki tehtävät?')) return;
  tasks = [];
  saveTasks();
  render();
});

saveManualBtn.addEventListener('click', () => {
  saveTasks();
  alert('Tallennettu!');
});


function toggleDone(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter(x => x.id !== id);
  saveTasks();
  render();
}

function editTask(id, newTitle) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.title = newTitle;
  saveTasks();
  render();
}


function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Load error', err);
    return [];
  }
}


function render() {
  taskList.innerHTML = '';

  
  let visible = tasks.slice();
  if (currentFilter === 'active') visible = visible.filter(t => !t.done);
  if (currentFilter === 'done') visible = visible.filter(t => t.done);
  if (hideCompleted) visible = visible.filter(t => !t.done);

  if (visible.length === 0) {
    const li = document.createElement('li');
    li.className = 'task empty';
    li.textContent = 'Ei näytettäviä tehtäviä.';
    taskList.appendChild(li);
  } else {
    visible.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task';
      li.dataset.id = task.id;
      li.draggable = true;
      if (task.done) li.classList.add('done');

      
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = task.done;
      cb.addEventListener('change', () => toggleDone(task.id));

      
      const txt = document.createElement('div');
      txt.className = 'text';
      txt.textContent = task.title;

      txt.addEventListener('dblclick', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = task.title;
        input.style.flex = '1';
        li.replaceChild(input, txt);
        input.focus();

        function finish() {
          const val = input.value.trim();
          if (!val) {
            alert('Teksti ei saa olla tyhjä.');
            render();
            return;
          }
          editTask(task.id, val);
        }
        input.addEventListener('blur', finish, { once: true });
        input.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') input.blur();
          if (ev.key === 'Escape') render();
        });
      });

      
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${task.priority}${ task.remind ? ' • muistutus' : ''}`;

      const btnDel = document.createElement('button');
      btnDel.className = 'btn danger';
      btnDel.textContent = 'Poista';
      btnDel.addEventListener('click', () => {
        if (confirm('Poistetaanko tehtävä?')) deleteTask(task.id);
      });

      
      li.appendChild(cb);
      li.appendChild(txt);
      li.appendChild(meta);
      li.appendChild(btnDel);

      
      li.addEventListener('dragstart', dragStart);
      li.addEventListener('dragover', dragOver);
      li.addEventListener('drop', drop);
      li.addEventListener('dragend', dragEnd);

      taskList.appendChild(li);
    });
  }


  const openCount = tasks.filter(t => !t.done).length;
  counterEl.textContent = `${openCount} auki`;

  saveTasks();
}


function showValidationError(field, msg) {
  if (field === 'title') {
    titleInput.classList.add('invalid');
    titleError.textContent = msg;
    titleError.setAttribute('aria-hidden', 'false');
  }
}
function clearValidation() {
  titleInput.classList.remove('invalid');
  titleError.textContent = '';
  titleError.setAttribute('aria-hidden', 'true');
}

let dragSrcId = null;
function dragStart(e) {
  this.classList.add('draggable');
  dragSrcId = this.dataset.id;
  e.dataTransfer.effectAllowed = 'move';
}
function dragOver(e) {
  e.preventDefault();
  this.classList.add('drag-over');
  e.dataTransfer.dropEffect = 'move';
}
function drop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  const targetId = this.dataset.id;
  if (!dragSrcId || dragSrcId === targetId) return;

  
  const srcIndex = tasks.findIndex(t => t.id === dragSrcId);
  const tgtIndex = tasks.findIndex(t => t.id === targetId);
  if (srcIndex < 0 || tgtIndex < 0) return;

  
  const [moved] = tasks.splice(srcIndex, 1);
  tasks.splice(tgtIndex, 0, moved);
  saveTasks();
  render();
}
function dragEnd() {
  this.classList.remove('draggable');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  dragSrcId = null;
}

function generateId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2,9);
}
