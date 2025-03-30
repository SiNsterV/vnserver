document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const combineForm = document.getElementById('combineForm');
    const progressContainer = document.getElementById('progress');
    function showCustomAlert(message) {
        const alertBox = document.getElementById('custom-alert');
        const alertMessage = alertBox.querySelector('.alert-message');
        const alertButton = alertBox.querySelector('.alert-button');
    
        alertMessage.textContent = message;
        alertBox.style.display = 'flex';
    
        alertButton.onclick = () => {
            alertBox.style.display = 'none';
        };
    }

    
    
    // Handle drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('highlight');
    }
    
    function unhighlight() {
        dropArea.classList.remove('highlight');
    }
    
    dropArea.addEventListener('drop', handleDrop, false);
    dropArea.addEventListener('click', () => fileInput.click());
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }
    
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });
    
    function handleFiles(files) {
        fileList.innerHTML = '';
        
        Array.from(files).forEach(file => {
            if (file.type === 'application/pdf') {
                addFileToList(file);
            }
        });
    }
    
    function addFileToList(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span>${file.name} (${formatFileSize(file.size)})</span>
            <button class="remove-file">&times;</button>
        `;
        
        fileItem.querySelector('.remove-file').addEventListener('click', () => {
            fileItem.remove();
        });
        
        fileList.appendChild(fileItem);
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    function addFileToList(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.draggable = true;
        fileItem.dataset.filename = file.name;
        fileItem.innerHTML = `
            <span class="drag-handle">⋮⋮</span>
            <span>${file.name} (${formatFileSize(file.size)})</span>
            <button class="remove-file">&times;</button>
        `;
        
        fileItem.querySelector('.remove-file').addEventListener('click', () => {
            fileItem.remove();
        });

        // Add drag and drop event listeners
        fileItem.addEventListener('dragstart', handleDragStart);
        fileItem.addEventListener('dragover', handleDragOver);
        fileItem.addEventListener('drop', handleFileReorder);
        fileItem.addEventListener('dragend', handleDragEnd);
        
        fileList.appendChild(fileItem);
    }

    function handleDragStart(e) {
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.target.dataset.filename);
    }

    function handleDragOver(e) {
        e.preventDefault();
        const draggingElement = document.querySelector('.dragging');
        const fileItems = [...fileList.querySelectorAll('.file-item:not(.dragging)')];
        
        const closest = fileItems.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = e.clientY - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;

        if (closest) {
            fileList.insertBefore(draggingElement, closest);
        } else {
            fileList.appendChild(draggingElement);
        }
    }

    function handleFileReorder(e) {
        e.preventDefault();
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }
    
    
    combineForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const fileItems = fileList.querySelectorAll('.file-item');
        if (fileItems.length < 2) {
            showCustomAlert('Please upload at least 2 PDF files to combine.');
            return;
        }
        
        const formData = new FormData();
        // Get files in the order they appear in the list
        const orderedFiles = Array.from(fileItems).map(item => {
            const fileName = item.dataset.filename;
            return Array.from(fileInput.files).find(file => file.name === fileName);
        });
        
        orderedFiles.forEach(file => {
            formData.append('files', file);
        });
        
        try {
            progressContainer.style.display = 'block';
            
            const response = await fetch('/api/combine-pdfs', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'combined.pdf';
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                const error = await response.json();
                showCustomAlert('An error occurred while combining PDFs');
            }
        } catch (error) {
            console.error('Error:', error);
            showCustomAlert('An error occurred while combining PDFs');
        } finally {
            progressContainer.style.display = 'none';
        }
    });
    
    
});

