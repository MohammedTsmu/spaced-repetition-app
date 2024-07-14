document.addEventListener('DOMContentLoaded', () => {
    console.log('تطبيق التكرار المتباعد جاهز!');

    const form = document.getElementById('subject-form');
    const subjectsList = document.getElementById('subjects-list');
    const backupButton = document.getElementById('backup-button');
    const importFile = document.getElementById('import-file');
    const searchInput = document.getElementById('search-input');
    const notificationSound = document.getElementById('notification-sound');
    const notificationsContainer = document.getElementById('notifications');
    const statsChartCanvas = document.getElementById('stats-chart').getContext('2d');
    const themeSelect = document.getElementById('theme-select');
    let statsChart;

    const dbPromise = idb.openDB('subjects-db', 1, {
        upgrade(db) {
            db.createObjectStore('subjects', {
                keyPath: 'id',
                autoIncrement: true
            });
        }
    });

    async function getSubjects() {
        const db = await dbPromise;
        return db.getAll('subjects');
    }

    async function addSubject(subject) {
        const db = await dbPromise;
        await db.add('subjects', subject);
    }

    async function updateSubject(id, updates) {
        const db = await dbPromise;
        const subject = await db.get('subjects', id);
        Object.assign(subject, updates);
        await db.put('subjects', subject);
    }

    async function deleteSubject(id) {
        const db = await dbPromise;
        await db.delete('subjects', id);
    }

    async function renderSubjects(subjects) {
        subjectsList.innerHTML = '';

        // ترتيب المواضيع حسب موعد المراجعة الأقرب
        subjects.sort((a, b) => a.nextReview - b.nextReview);

        subjects.forEach(subject => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${subject.name} - ${subject.details} - الموعد التالي: ${new Date(subject.nextReview).toLocaleDateString()}
                <div class="review-buttons">
                    <button class="review-button" data-id="${subject.id}" data-score="1">جيد</button>
                    <button class="review-button" data-id="${subject.id}" data-score="2">ممتاز</button>
                </div>
            `;
            subjectsList.appendChild(li);
        });
    }

    async function updateStats() {
        const subjects = await getSubjects();
        const totalSubjects = subjects.length;
        const reviewedSubjects = subjects.filter(subject => subject.repeatCount > 0).length;
        const remainingSubjects = totalSubjects - reviewedSubjects;

        document.getElementById('total-subjects').textContent = `إجمالي المواضيع: ${totalSubjects}`;
        document.getElementById('reviewed-subjects').textContent = `المواضيع التي تم مراجعتها: ${reviewedSubjects}`;
        document.getElementById('remaining-subjects').textContent = `المواضيع المتبقية: ${remainingSubjects}`;

        updateChart(totalSubjects, reviewedSubjects, remainingSubjects);
    }

    function updateChart(total, reviewed, remaining) {
        if (statsChart) {
            statsChart.destroy();
        }

        statsChart = new Chart(statsChartCanvas, {
            type: 'bar',
            data: {
                labels: ['إجمالي المواضيع', 'المواضيع التي تم مراجعتها', 'المواضيع المتبقية'],
                datasets: [{
                    label: 'الإحصائيات',
                    data: [total, reviewed, remaining],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = form.subject.value;
        const details = form.details.value;
        const nextReview = Date.now() + 24 * 60 * 60 * 1000;
        const repeatCount = 0;

        const newSubject = { name, details, nextReview, repeatCount };

        await addSubject(newSubject);
        const subjects = await getSubjects();
        await renderSubjects(subjects);
        await updateStats();

        form.reset();
        showNotification('تم إضافة الموضوع بنجاح!', 'success');
    });

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        notificationsContainer.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);

        if (type === 'info') {
            notificationSound.play();
        }
    }

    async function checkForReviews() {
        const now = Date.now();
        const subjects = await getSubjects();
        subjects.forEach(async (subject) => {
            if (now >= subject.nextReview) {
                showNotification(`حان وقت مراجعة الموضوع: ${subject.name}`, 'info');
            }
        });
    }

    setInterval(checkForReviews, 60 * 1000);

    subjectsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('review-button')) {
            const id = parseInt(e.target.dataset.id, 10);
            const score = parseInt(e.target.dataset.score, 10);

            const subjects = await getSubjects();
            const subject = subjects.find(sub => sub.id === id);
            const now = Date.now();

            if (score === 1) {
                subject.nextReview = now + 2 * 24 * 60 * 60 * 1000;
            } else if (score === 2) {
                subject.nextReview = now + 4 * 24 * 60 * 60 * 1000;
            }

            subject.repeatCount += 1;

            if (subject.repeatCount >= 5) {
                await deleteSubject(id);
                showNotification(`تم حذف الموضوع: ${subject.name} بعد إكمال جميع التكرارات.`, 'success');
            } else {
                await updateSubject(id, { nextReview: subject.nextReview, repeatCount: subject.repeatCount });
                showNotification(`تم تحديث الموضوع: ${subject.name}`, 'success');
            }

            const updatedSubjects = await getSubjects();
            await renderSubjects(updatedSubjects);
            await updateStats();
        }
    });

    searchInput.addEventListener('input', async (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const subjects = await getSubjects();
        const filteredSubjects = subjects.filter(subject =>
            subject.name.toLowerCase().includes(searchTerm) ||
            subject.details.toLowerCase().includes(searchTerm)
        );
        await renderSubjects(filteredSubjects);
    });

    backupButton.addEventListener('click', async () => {
        const subjects = await getSubjects();
        const dataStr = JSON.stringify(subjects);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'subjects_backup.json';
        a.click();
        URL.revokeObjectURL(url);
        showNotification('تم النسخ الاحتياطي للبيانات بنجاح!', 'success');
    });

    importFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
            const importedSubjects = JSON.parse(event.target.result);
            const db = await dbPromise;
            const tx = db.transaction('subjects', 'readwrite');
            const store = tx.objectStore('subjects');
            await store.clear();
            for (const subject of importedSubjects) {
                await store.add(subject);
            }
            await tx.done;
            const subjects = await getSubjects();
            await renderSubjects(subjects);
            await updateStats();
            showNotification('تم استيراد البيانات بنجاح!', 'success');
        };
        reader.readAsText(file);
    });

    // إدارة السمات
    themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        document.body.className = theme;
        localStorage.setItem('theme', theme);
    });

    // تحميل السمة المحفوظة
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme;
    themeSelect.value = savedTheme;

    async function init() {
        const subjects = await getSubjects();
        await renderSubjects(subjects);
        await updateStats();
    }

    init();

    // وظيفة التنقل بين الأقسام
    document.querySelectorAll('nav ul li a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.dataset.section;
            document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(section).classList.add('active');
        });
    });
});
