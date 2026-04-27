document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todo-input');
    const addBtn = document.getElementById('add-btn');
    const todosList = document.getElementById('todos-list');

    // Load from localStorage or empty array
    let todos = JSON.parse(localStorage.getItem('todos')) || [];

    const saveTodos = () => {
        localStorage.setItem('todos', JSON.stringify(todos));
    };

    const renderTodos = () => {
        todosList.innerHTML = '';
        
        if (todos.length === 0) {
            todosList.innerHTML = '<div class="empty-state">まだタスクがありません。上の入力欄から追加してください！</div>';
            return;
        }

        todos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            li.dataset.id = todo.id;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'todo-content';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'todo-checkbox';
            checkbox.checked = todo.completed;
            checkbox.addEventListener('change', () => toggleTodo(todo.id));

            const span = document.createElement('span');
            span.className = 'todo-text';
            span.textContent = todo.text;

            contentDiv.appendChild(checkbox);
            contentDiv.appendChild(span);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '削除';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id, li));

            li.appendChild(contentDiv);
            li.appendChild(deleteBtn);
            todosList.appendChild(li);
        });
    };

    const addTodo = () => {
        const text = todoInput.value.trim();
        if (!text) return;

        const newTodo = {
            id: Date.now().toString(),
            text,
            completed: false
        };

        todos.push(newTodo);
        saveTodos();
        todoInput.value = '';
        renderTodos();
    };

    const toggleTodo = (id) => {
        todos = todos.map(t => {
            if (t.id === id) {
                return { ...t, completed: !t.completed };
            }
            return t;
        });
        saveTodos();
        renderTodos();
    };

    const deleteTodo = (id, liElement) => {
        // Add removing class for animation
        liElement.classList.add('removing');
        
        // Wait for animation to finish before actual deletion
        setTimeout(() => {
            todos = todos.filter(t => t.id !== id);
            saveTodos();
            renderTodos();
        }, 300);
    };

    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });

    // Initial render
    renderTodos();
});
