const SUPABASE_URL = "https://iqrpmqqksfjcnxarpwmp.supabase.co/rest/v1/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxcnBtcXFrc2ZqY254YXJwd21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MzIzNDQsImV4cCI6MjA5NjIwODM0NH0.-nUJUH1FUDjy3s42LDOF85gVvLThdIQ7hjfNMnaCWlg";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const QUESTION_KEY = "apexPitQuestionsV2";
const PARTICIPANT_KEY = "apexPitParticipantsV2";
const ADMIN_SESSION_KEY = "apexPitAdminLoggedInV2";

const ADMIN_USERNAME = "DriftX";
const ADMIN_PASSWORD = "DriftX@2055";

const dummyQuestions = [
  {
    id: crypto.randomUUID(),
    type: "mcq",
    question: "When an F1 car increases speed, what mainly creates extra downforce?",
    options: ["Air pressure difference around wings", "Heavier tyres", "More fuel in the tank", "Driver body weight"],
    answer: "Air pressure difference around wings",
  },
  {
    id: crypto.randomUUID(),
    type: "typed",
    question: "Which physics quantity is calculated as mass multiplied by acceleration?",
    options: [],
    answer: "force",
  },
  {
    id: crypto.randomUUID(),
    type: "mcq",
    question: "Why do slick tyres give more grip on a dry F1 track?",
    options: ["More rubber contacts the road", "They are lighter than air", "They reduce engine heat", "They make braking distance longer"],
    answer: "More rubber contacts the road",
  },
  {
    id: crypto.randomUUID(),
    type: "typed",
    question: "What is the SI unit of torque used when discussing engine output?",
    options: [],
    answer: "newton metre",
  },
  {
    id: crypto.randomUUID(),
    type: "mcq",
    question: "During hard braking, why does the front of an F1 car carry more load?",
    options: ["Weight transfer", "Less gravity", "Fuel vaporization", "Lower tyre pressure only"],
    answer: "Weight transfer",
  },
];

let activeContestant = null;

const $ = (selector) => document.querySelector(selector);

function getQuestions() {
  const saved = localStorage.getItem(QUESTION_KEY);
  if (!saved) {
    localStorage.setItem(QUESTION_KEY, JSON.stringify(dummyQuestions));
    return dummyQuestions;
  }
  return JSON.parse(saved);
}

function saveQuestions(questions) {
  localStorage.setItem(QUESTION_KEY, JSON.stringify(questions));
}

function getParticipants() {
  return JSON.parse(localStorage.getItem(PARTICIPANT_KEY) || "[]");
}

function saveParticipants(participants) {
  localStorage.setItem(PARTICIPANT_KEY, JSON.stringify(participants));
}

function normalizeAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderStats() {
  $("#questionCount").textContent = getQuestions().length;
  $("#participantCount").textContent = getParticipants().length;
}

function renderQuizQuestions() {
  const questions = getQuestions();
  const questionList = $("#questionList");

  if (!questions.length) {
    questionList.innerHTML = `<p class="empty-row">No questions are active. Please ask admin to add questions.</p>`;
    return;
  }

  questionList.innerHTML = questions
    .map((question, index) => {
      const title = `<h4>${index + 1}. ${escapeHtml(question.question)}</h4>`;
      if (question.type === "mcq") {
        const choices = question.options
          .map(
            (option) => `
              <label class="choice">
                <input type="radio" name="answer-${question.id}" value="${escapeHtml(option)}" required />
                <span>${escapeHtml(option)}</span>
              </label>
            `
          )
          .join("");
        return `<article class="question-card">${title}<div class="choice-list">${choices}</div></article>`;
      }

      return `
        <article class="question-card">
          ${title}
          <label>
            Type your answer
            <input type="text" name="answer-${question.id}" placeholder="Enter answer" required />
          </label>
        </article>
      `;
    })
    .join("");
}

function showStartPanel() {
  activeContestant = null;
  $("#startForm").classList.remove("is-hidden");
  $("#quizForm").classList.add("is-hidden");
  $("#resultPanel").classList.add("is-hidden");
  $("#startForm").reset();
}

function renderLeaderboard() {
  const participants = getParticipants().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.completedAt) - new Date(b.completedAt);
  });

  const body = $("#leaderboardBody");
  if (!participants.length) {
    body.innerHTML = `<tr><td class="empty-row" colspan="5">No completed quiz runs yet.</td></tr>`;
  } else {
    body.innerHTML = participants
      .map(
        (participant, index) => `
          <tr>
            <td>#${index + 1}</td>
            <td>${escapeHtml(participant.name)}</td>
            <td>${escapeHtml(participant.phone)}</td>
            <td>${participant.score}/${participant.total}</td>
            <td>${formatDate(participant.completedAt)}</td>
          </tr>
        `
      )
      .join("");
  }

  renderAdminParticipants();
  renderStats();
}

function renderAdminParticipants() {
  const body = $("#adminParticipantsBody");
  if (!body) return;

  const participants = getParticipants().sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  if (!participants.length) {
    body.innerHTML = `<tr><td class="empty-row" colspan="5">No participant data yet.</td></tr>`;
    return;
  }

  body.innerHTML = participants
    .map(
      (participant) => `
        <tr>
          <td>${escapeHtml(participant.name)}</td>
          <td>${escapeHtml(participant.phone)}</td>
          <td>${participant.score}/${participant.total}</td>
          <td>${participant.correct}</td>
          <td>${formatDate(participant.completedAt)}</td>
        </tr>
      `
    )
    .join("");
}

function renderAdminQuestions() {
  const list = $("#adminQuestionList");
  const questions = getQuestions();

  if (!questions.length) {
    list.innerHTML = `<p class="empty-row">No questions added yet.</p>`;
    return;
  }

  list.innerHTML = questions
    .map(
      (question) => `
        <article class="admin-question-item">
          <div>
            <p>${escapeHtml(question.question)}</p>
            <div class="question-meta">
              ${question.type.toUpperCase()} | Answer: ${escapeHtml(question.answer)}
              ${question.type === "mcq" ? ` | Options: ${question.options.map(escapeHtml).join(", ")}` : ""}
            </div>
          </div>
          <div class="item-actions">
            <button class="button small ghost" type="button" data-edit="${question.id}">Edit</button>
            <button class="button small ghost danger" type="button" data-delete="${question.id}">Delete</button>
          </div>
        </article>
      `
    )
    .join("");
}

function setAdminState(isLoggedIn) {
  localStorage.setItem(ADMIN_SESSION_KEY, isLoggedIn ? "true" : "false");
  $("#adminLogin").classList.toggle("is-hidden", isLoggedIn);
  $("#adminDashboard").classList.toggle("is-hidden", !isLoggedIn);
  if (isLoggedIn) {
    renderAdminQuestions();
    renderAdminParticipants();
  }
}

function resetQuestionForm() {
  $("#questionForm").reset();
  $("#editingQuestionId").value = "";
  $("#adminQuestionType").value = "mcq";
  $("#optionsField").classList.remove("is-hidden");
}

function exportParticipantsCsv() {
  const participants = getParticipants();
  const headers = ["Name", "Phone", "Score", "Total", "Correct", "Completed"];
  const rows = participants.map((participant) => [
    participant.name,
    participant.phone,
    participant.score,
    participant.total,
    participant.correct,
    participant.completedAt,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "apex-pit-participants.csv";
  link.click();
  URL.revokeObjectURL(url);
}

$("#startForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const questions = getQuestions();
  if (!questions.length) {
    alert("No questions are active. Please ask admin to add questions.");
    return;
  }

  activeContestant = {
    name: $("#contestantName").value.trim(),
    phone: $("#contestantPhone").value.trim(),
  };

  renderQuizQuestions();
  $("#quizContestant").textContent = activeContestant.name;
  $("#quizProgress").textContent = `${questions.length} questions loaded`;
  $("#startForm").classList.add("is-hidden");
  $("#quizForm").classList.remove("is-hidden");
});

$("#quizForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const questions = getQuestions();
  const formData = new FormData(event.currentTarget);
  let correct = 0;

  questions.forEach((question) => {
    const value = formData.get(`answer-${question.id}`);
    if (normalizeAnswer(value) === normalizeAnswer(question.answer)) {
      correct += 1;
    }
  });

  const participant = {
    id: crypto.randomUUID(),
    name: activeContestant.name,
    phone: activeContestant.phone,
    score: correct,
    correct,
    total: questions.length,
    completedAt: new Date().toISOString(),
  };

  saveParticipants([...getParticipants(), participant]);
  $("#quizForm").classList.add("is-hidden");
  $("#resultPanel").classList.remove("is-hidden");
  $("#resultTitle").textContent = `${participant.name}, your score is saved`;
  $("#resultCopy").textContent = "Your result is now visible on the live leaderboard.";
  $("#resultScore").textContent = `${correct}/${questions.length}`;
  renderLeaderboard();
});

$("#cancelQuiz").addEventListener("click", showStartPanel);
$("#newRun").addEventListener("click", showStartPanel);

$("#clearAdminScores").addEventListener("click", () => {
  if (!confirm("Clear all participant scores from this browser?")) return;
  saveParticipants([]);
  renderLeaderboard();
});

$("#adminLogin").addEventListener("submit", (event) => {
  event.preventDefault();
  const username = $("#adminUser").value.trim();
  const password = $("#adminPass").value;
  const isValid = username === ADMIN_USERNAME && password === ADMIN_PASSWORD;

  $("#loginError").textContent = isValid ? "" : "Invalid admin login details.";
  if (isValid) setAdminState(true);
});

$("#adminLogout").addEventListener("click", () => {
  setAdminState(false);
});

$("#adminQuestionType").addEventListener("change", (event) => {
  $("#optionsField").classList.toggle("is-hidden", event.target.value !== "mcq");
});

$("#questionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = $("#editingQuestionId").value || crypto.randomUUID();
  const type = $("#adminQuestionType").value;
  const options = $("#adminOptions")
    .value.split("\n")
    .map((option) => option.trim())
    .filter(Boolean);
  const answer = $("#adminAnswer").value.trim();

  if (type === "mcq" && options.length < 2) {
    alert("Please add at least two MCQ options.");
    return;
  }
  if (type === "mcq" && !options.map(normalizeAnswer).includes(normalizeAnswer(answer))) {
    alert("For MCQ questions, the correct answer must match one of the options.");
    return;
  }

  const question = {
    id,
    type,
    question: $("#adminQuestion").value.trim(),
    options: type === "mcq" ? options : [],
    answer,
  };

  const questions = getQuestions();
  const existingIndex = questions.findIndex((item) => item.id === id);
  if (existingIndex >= 0) {
    questions[existingIndex] = question;
  } else {
    questions.push(question);
  }

  saveQuestions(questions);
  resetQuestionForm();
  renderAdminQuestions();
  renderStats();
});

$("#resetQuestionForm").addEventListener("click", resetQuestionForm);

$("#adminQuestionList").addEventListener("click", (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  const questions = getQuestions();

  if (editId) {
    const question = questions.find((item) => item.id === editId);
    if (!question) return;
    $("#editingQuestionId").value = question.id;
    $("#adminQuestion").value = question.question;
    $("#adminQuestionType").value = question.type;
    $("#adminOptions").value = question.options.join("\n");
    $("#adminAnswer").value = question.answer;
    $("#optionsField").classList.toggle("is-hidden", question.type !== "mcq");
    $("#adminQuestion").focus();
  }

  if (deleteId) {
    if (!confirm("Delete this question?")) return;
    saveQuestions(questions.filter((item) => item.id !== deleteId));
    renderAdminQuestions();
    renderStats();
  }
});

$("#restoreDummyQuestions").addEventListener("click", () => {
  saveQuestions(dummyQuestions.map((question) => ({ ...question, id: crypto.randomUUID() })));
  resetQuestionForm();
  renderAdminQuestions();
  renderStats();
});

$("#exportParticipants").addEventListener("click", exportParticipantsCsv);

getQuestions();
renderStats();
renderLeaderboard();
setAdminState(localStorage.getItem(ADMIN_SESSION_KEY) === "true");
async function testConnection() {
  const { data, error } = await supabase
    .from("participants")
    .select("*");

  console.log("DATA:", data);
  console.log("ERROR:", error);
}

testConnection();