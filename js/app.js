document.addEventListener('DOMContentLoaded', () => {
    console.log('Spaced Repetition App Ready!');

    const form = document.getElementById('subject-form');
    const subjectsList = document.getElementById('subjects-list');
    const backupButton = document.getElementById('backup-button');
    const importFile = document.getElementById('import-file');
    const searchInput = document.getElementById('search-input');
    const notificationSound = document.getElementById('notification-sound');
    const notificationsContainer = document.getElementById('notifications');
    const statsChartCanvas = document.getElementById('stats-chart').getContext('2d');
    const pieChartCanvas = document.getElementById('pie-chart').getContext('2d');
    const themeSelect = document.getElementById('theme-select');
    const languageSelect = document.getElementById('language-select');
    const homeTotalSubjects = document.getElementById('home-total-subjects');
    const homeReviewedSubjects = document.getElementById('home-reviewed-subjects');
    const homeRemainingSubjects = document.getElementById('home-remaining-subjects');
    let statsChart;
    let pieChart;

    // تعريف اللغة الحالية في البداية
    let currentLanguage;

    const dbPromise = idb.openDB('subjects-db', 1, {
        upgrade(db) {
            db.createObjectStore('subjects', {
                keyPath: 'id',
                autoIncrement: true
            });
        }
    });

    const translations = {
        en: {
            appTitle: "Spaced Repetition App",
            home: "Home",
            subjects: "Subjects",
            stats: "Stats",
            settings: "Settings",
            homeTitle: "Home",
            homeWelcome: "Welcome to the Spaced Repetition App! Use this app to manage your subjects and schedule their reviews based on the spaced repetition principle.",
            totalSubjects: "Total Subjects:",
            reviewedSubjects: "Reviewed Subjects:",
            remainingSubjects: "Remaining Subjects:",
            tipsTitle: "Tips for using the app:",
            tip1: "Add your subjects using the form in the Subjects section.",
            tip2: "Review the subjects based on the suggested schedule.",
            tip3: "Use the Stats section to track your progress.",
            tip4: "Don't forget to backup and import your data when needed.",
            addSubjectTitle: "Add a New Subject",
            subjectLabel: "Subject:",
            detailsLabel: "Details:",
            addButton: "Add Subject",
            subjectsTitle: "Subjects",
            searchPlaceholder: "Search for a subject...",
            statsTitle: "Performance Stats",
            backupTitle: "Backup and Import Data",
            backupButton: "Backup Data",
            themeTitle: "Change Theme",
            themeLabel: "Choose Theme:",
            lightTheme: "Light",
            darkTheme: "Dark",
            languageTitle: "Change Language",
            languageLabel: "Choose Language:",
            english: "English",
            arabic: "العربية"
        },
        ar: {
            appTitle: "تطبيق التكرار المتباعد",
            home: "الصفحة الرئيسية",
            subjects: "المواضيع",
            stats: "إحصائيات",
            settings: "الإعدادات",
            homeTitle: "الصفحة الرئيسية",
            homeWelcome: "مرحبًا بك في تطبيق التكرار المتباعد! يمكنك استخدام هذا التطبيق لإدارة مواضيعك وجدولة مواعيد مراجعتها بناءً على مبدأ التكرار المتباعد.",
            totalSubjects: "إجمالي المواضيع:",
            reviewedSubjects: "المواضيع التي تم مراجعتها:",
            remainingSubjects: "المواضيع المتبقية:",
            tipsTitle: "نصائح لاستخدام التطبيق:",
            tip1: "أضف مواضيعك باستخدام النموذج في قسم المواضيع.",
            tip2: "قم بمراجعة المواضيع بناءً على الجدول الزمني المقترح.",
            tip3: "استخدم قسم الإحصائيات لمتابعة تقدمك.",
            tip4: "لا تنسى إجراء النسخ الاحتياطي للبيانات واستيرادها عند الحاجة.",
            addSubjectTitle: "إضافة موضوع جديد",
            subjectLabel: "الموضوع:",
            detailsLabel: "التفاصيل:",
            addButton: "إضافة الموضوع",
            subjectsTitle: "المواضيع",
            searchPlaceholder: "ابحث عن موضوع...",
            statsTitle: "إحصائيات الأداء",
            backupTitle: "النسخ الاحتياطي واستيراد البيانات",
            backupButton: "نسخ احتياطي للبيانات",
            themeTitle: "تغيير السمات",
            themeLabel: "اختر السمة:",
            lightTheme: "فاتح",
            darkTheme: "داكن",
            languageTitle: "تغيير اللغة",
            languageLabel: "اختر اللغة:",
            english: "الإنجليزية",
            arabic: "العربية"
        }
    };

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
                    <button class="review-button" data-id="${subject.id}" data-score="1"><i class="fas fa-check"></i> <span data-lang="good">Good</span></button>
                    <button class="review-button" data-id="${subject.id}" data-score="2"><i class="fas fa-star"></i> <span data-lang="excellent">Excellent</span></button>
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

        document.getElementById('total-subjects').textContent = `${translations[currentLanguage].totalSubjects} ${totalSubjects}`;
        document.getElementById('reviewed-subjects').textContent = `${translations[currentLanguage].reviewedSubjects} ${reviewedSubjects}`;
        document.getElementById('remaining-subjects').textContent = `${translations[currentLanguage].remainingSubjects} ${remainingSubjects}`;

        homeTotalSubjects.textContent = totalSubjects;
        homeReviewedSubjects.textContent = reviewedSubjects;
        homeRemainingSubjects.textContent = remainingSubjects;

        updateBarChart(totalSubjects, reviewedSubjects, remainingSubjects);
        updatePieChart(totalSubjects, reviewedSubjects, remainingSubjects);
    }

    function updateBarChart(total, reviewed, remaining) {
        if (statsChart) {
            statsChart.destroy();
        }

        statsChart = new Chart(statsChartCanvas, {
            type: 'bar',
            data: {
                labels: [
                    translations[currentLanguage].totalSubjects,
                    translations[currentLanguage].reviewedSubjects,
                    translations[currentLanguage].remainingSubjects
                ],
                datasets: [{
                    label: translations[currentLanguage].statsTitle,
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

    function updatePieChart(total, reviewed, remaining) {
        if (pieChart) {
            pieChart.destroy();
        }

        pieChart = new Chart(pieChartCanvas, {
            type: 'pie',
            data: {
                labels: [
                    translations[currentLanguage].totalSubjects,
                    translations[currentLanguage].reviewedSubjects,
                    translations[currentLanguage].remainingSubjects
                ],
                datasets: [{
                    label: translations[currentLanguage].statsTitle,
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
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (tooltipItem) {
                                const label = tooltipItem.label || '';
                                const value = tooltipItem.raw;
                                return `${label}: ${value}`;
                            }
                        }
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
        showNotification(translations[currentLanguage].addButton, 'success');
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
                showNotification(`${translations[currentLanguage].reviewSubject}: ${subject.name}`, 'info');
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
                showNotification(`${translations[currentLanguage].deleteSubject}: ${subject.name}`, 'success');
            } else {
                await updateSubject(id, { nextReview: subject.nextReview, repeatCount: subject.repeatCount });
                showNotification(`${translations[currentLanguage].updateSubject}: ${subject.name}`, 'success');
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
        showNotification(translations[currentLanguage].backupSuccess, 'success');
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
            showNotification(translations[currentLanguage].importSuccess, 'success');
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

    // إدارة اللغة
    languageSelect.addEventListener('change', (e) => {
        const lang = e.target.value;
        setLanguage(lang);
        localStorage.setItem('language', lang);
    });

    // تحميل اللغة المحفوظة
    const savedLanguage = localStorage.getItem('language') || 'en';
    setLanguage(savedLanguage);
    languageSelect.value = savedLanguage;

    function setLanguage(lang) {
        const elements = document.querySelectorAll('[data-lang]');
        elements.forEach(el => {
            const key = el.getAttribute('data-lang');
            el.textContent = translations[lang][key];
        });
        if (lang === 'ar') {
            document.body.classList.add('rtl');
        } else {
            document.body.classList.remove('rtl');
        }
        currentLanguage = lang;
    }

    // تعريف اللغة الحالية بعد تحميلها من التخزين المحلي
    currentLanguage = savedLanguage;

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
            const section = e.target.closest('a').dataset.section;
            if (section) {
                document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
                document.getElementById(section).classList.add('active');
            }
        });
    });
});
