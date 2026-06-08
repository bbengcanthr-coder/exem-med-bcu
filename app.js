import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { questionsDB } from "./questions.js";

// --- FIREBASE CONFIGURATION ---
// ให้เปลี่ยนค่าตรงนี้เป็น Config จาก Firebase Project ของคุณ
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// State variables
let currentStudent = "";
let currentYear = "";

// DOM Elements
const sectionLogin = document.getElementById('login-section');
const sectionExam = document.getElementById('exam-section');
const sectionResult = document.getElementById('result-section');
const formStudent = document.getElementById('student-form');
const formExam = document.getElementById('exam-form');
const containerQuestions = document.getElementById('questions-container');

// 1. Handle Login / Start Exam
formStudent.addEventListener('submit', (e) => {
    e.preventDefault();
    currentStudent = document.getElementById('student-name').value;
    currentYear = document.getElementById('student-year').value;
    
    document.getElementById('exam-student-info').textContent = `ผู้เข้าสอบ: ${currentStudent} | ระดับชั้นปี: ${currentYear}`;
    
    renderExam(currentYear);
    
    sectionLogin.classList.remove('active');
    sectionLogin.classList.add('hidden');
    sectionExam.classList.remove('hidden');
    sectionExam.classList.add('active');
});

// 2. Render Exam Questions
function renderExam(year) {
    containerQuestions.innerHTML = '';
    const subjects = questionsDB[year];
    
    for (const [subjectName, questions] of Object.entries(subjects)) {
        const subjectDiv = document.createElement('div');
        subjectDiv.className = 'subject-group';
        
        const title = document.createElement('h3');
        title.className = 'subject-title';
        title.textContent = subjectName;
        subjectDiv.appendChild(title);
        
        questions.forEach((q, index) => {
            const qBlock = document.createElement('div');
            qBlock.className = 'question-block';
            
            const qText = document.createElement('div');
            qText.className = 'question-text';
            qText.textContent = `${index + 1}. ${q.question}`;
            qBlock.appendChild(qText);
            
            const optGroup = document.createElement('div');
            optGroup.className = 'options-group';
            
            q.options.forEach((opt, optIndex) => {
                const label = document.createElement('label');
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = q.id;
                radio.value = optIndex;
                radio.required = true; // บังคับตอบทุกข้อ
                
                label.appendChild(radio);
                label.appendChild(document.createTextNode(opt));
                optGroup.appendChild(label);
            });
            
            qBlock.appendChild(optGroup);
            subjectDiv.appendChild(qBlock);
        });
        
        containerQuestions.appendChild(subjectDiv);
    }
}

// 3. Calculate Grade
function calculateGradeInfo(score) {
    if (score >= 9) return { grade: 'A', point: 4.0 };
    if (score >= 8) return { grade: 'B+', point: 3.5 };
    if (score >= 7) return { grade: 'B', point: 3.0 };
    if (score >= 6) return { grade: 'C+', point: 2.5 };
    if (score >= 5) return { grade: 'C', point: 2.0 };
    if (score >= 4) return { grade: 'D+', point: 1.5 };
    if (score >= 3) return { grade: 'D', point: 1.0 };
    return { grade: 'F', point: 0.0 };
}

// 4. Handle Submit Exam
formExam.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(formExam);
    const subjects = questionsDB[currentYear];
    
    let totalPoints = 0;
    let subjectCount = 0;
    const resultsData = [];
    
    const tbody = document.getElementById('result-tbody');
    tbody.innerHTML = '';
    
    for (const [subjectName, questions] of Object.entries(subjects)) {
        let score = 0;
        questions.forEach(q => {
            const answer = formData.get(q.id);
            // เพื่อวัตถุประสงค์ในการจำลองระบบ หากตอบข้อแรก (0) จะได้คะแนน หรือจะสุ่มเพื่อให้ได้คะแนนต่างกัน
            if (parseInt(answer) === q.answer) {
                score += 1;
            } else {
                // สำหรับระบบจำลองนี้ เราจะบวกคะแนนให้สุ่มๆ เพื่อให้เห็นเกรดที่หลากหลายในการทดสอบ
                // ในระบบจริง ให้ลบ else นี้ออก
                score += Math.floor(Math.random() * 2); 
            }
        });
        
        // ป้องกันคะแนนเกิน 10
        if(score > 10) score = 10;
        if(score < 3) score = Math.floor(Math.random() * 5) + 5; // Fake score for demo
        
        const gradeInfo = calculateGradeInfo(score);
        totalPoints += gradeInfo.point;
        subjectCount += 1;
        
        resultsData.push({
            subject: subjectName,
            score: score,
            grade: gradeInfo.grade
        });
        
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${subjectName}</td><td>${score}/10</td><td><strong>${gradeInfo.grade}</strong></td>`;
        tbody.appendChild(tr);
    }
    
    const gpa = (totalPoints / subjectCount).toFixed(2);
    document.getElementById('final-gpa').textContent = gpa;
    document.getElementById('result-student-info').textContent = `ชื่อ: ${currentStudent} | ชั้นปี: ${currentYear}`;
    
    // 5. Save to Firebase
    try {
        await addDoc(collection(db, "exam_results"), {
            studentName: currentStudent,
            year: currentYear,
            gpa: parseFloat(gpa),
            subjects: resultsData,
            timestamp: serverTimestamp()
        });
        console.log("บันทึกข้อมูลลง Firebase สำเร็จ");
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการตั้งค่า Firebase");
    }
    
    sectionExam.classList.remove('active');
    sectionExam.classList.add('hidden');
    sectionResult.classList.remove('hidden');
    sectionResult.classList.add('active');
});

// 6. Restart
document.getElementById('btn-restart').addEventListener('click', () => {
    formStudent.reset();
    formExam.reset();
    sectionResult.classList.remove('active');
    sectionResult.classList.add('hidden');
    sectionLogin.classList.remove('hidden');
    sectionLogin.classList.add('active');
    window.scrollTo(0,0);
});
