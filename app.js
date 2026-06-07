const SUPABASE_URL = "https://iqrpmqqksfjcnxarpwmp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxcnBtcXFrc2ZqY254YXJwd21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MzIzNDQsImV4cCI6MjA5NjIwODM0NH0.-nUJUH1FUDjy3s42LDOF85gVvLThdIQ7hjfNMnaCWlg";

const supabaseClient = window.supabase.createClient(
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
let activeQuestion = null;

const $ = (selector) => document.querySelector(selector);

async function getParticipantsFromDB() {
  const { data, error } = await supabaseClient
    .from("participants")
    .select("*");

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}

async function saveParticipantToDB(participant) {
  const { data, error } = await supabaseClient
    .from("participants")
    .insert([participant])
    .select();

  console.log("INSERT DATA:", data);
  console.log("INSERT ERROR:", error);

  if (error) {
    alert(JSON.stringify(error, null, 2));
  }
}

async function getQuestions() {
  const { data, error } = await supabaseClient
    .from("questions")
    .select("*");

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

async function saveQuestions(questions) {
  const { data, error } = await supabaseClient
    .from("questions")
    .upsert(questions)
    .select();

  console.log("QUESTION DATA:", data);
  console.log("QUESTION ERROR:", error);

  if (error) {
    console.error(error);
    alert(JSON.stringify(error, null, 2));
    return;
  }

  const ids = questions.map((q) => q.id);
  if (ids.length) {
    const { error: delError } = await supabaseClient
      .from("questions")
      .delete()
      .not("id", "in", `(${ids.map((id) => `'${id}'`).join(',')})`);
    if (delError) console.error(delError);
  } else {
    // no ids -> delete all
    const { error: delError } = await supabaseClient
      .from("questions")
      .delete()
      .neq("id", "");
    if (delError) console.error(delError);
  }
}

async function getParticipants() {
  const { data, error } = await supabaseClient
    .from("participants")
    .select("*");

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
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

async function renderStats() {
  $("#questionCount").textContent = (await getQuestions()).length;
  $("#participantCount").textContent = (await getParticipants()).length;
}

async function renderQuizQuestions() {
  const questions = await getQuestions();
  const questionList = $("#questionList");

  if (!questions.length) {
    activeQuestion = null;
    questionList.innerHTML = `<p class="empty-row">No questions are active. Please ask admin to add questions.</p>`;
    return false;
  }

  const stream = activeContestant?.stream;
  const filteredQuestions = questions.filter((question) => question.stream === stream);

  if (!filteredQuestions.length) {
    activeQuestion = null;
    questionList.innerHTML = `<p class="empty-row">No questions available for your stream. Please contact the administrator.</p>`;
    return false;
  }

  const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
  activeQuestion = filteredQuestions[randomIndex];
  const title = `<h4>1. ${escapeHtml(activeQuestion.question)}</h4>`;

  if (activeQuestion.type === "mcq") {
    const choices = activeQuestion.options
      .map(
        (option) => `
              <label class="choice">
                <input type="radio" name="answer-${activeQuestion.id}" value="${escapeHtml(option)}" required />
                <span>${escapeHtml(option)}</span>
              </label>
            `
      )
      .join("");

    questionList.innerHTML = `<article class="question-card">${title}<div class="choice-list">${choices}</div></article>`;
  } else {
    questionList.innerHTML = `
      <article class="question-card">
        ${title}
        <label>
          Type your answer
          <input type="text" name="answer-${activeQuestion.id}" placeholder="Enter answer" required />
        </label>
      </article>
    `;
  }

  return true;
}

function showStartPanel() {
  activeContestant = null;
  $("#startForm").classList.remove("is-hidden");
  $("#quizForm").classList.add("is-hidden");
  $("#resultPanel").classList.add("is-hidden");
  $("#startForm").reset();
}

async function renderAdminParticipants() {
  const body = $("#adminParticipantsBody");
  if (!body) return;

  const participants = (await getParticipants()).sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
  if (!participants.length) {
    body.innerHTML = `<tr><td class="empty-row" colspan="6">No participant data yet.</td></tr>`;
    return;
  }

  body.innerHTML = participants
    .map(
      (participant) => `
        <tr>
          <td>${escapeHtml(participant.name)}</td>
          <td>${escapeHtml(participant.phone)}</td>
          <td>${escapeHtml(participant.stream || "-")}</td>
          <td>${participant.score}/${participant.total}</td>
          <td>${participant.correct}</td>
          <td>${formatDate(participant.completed_at)}</td>
        </tr>
      `
    )
    .join("");
}

async function renderAdminQuestions() {
  const list = $("#adminQuestionList");
  const questions = await getQuestions();

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

async function setAdminState(isLoggedIn) {
  localStorage.setItem(ADMIN_SESSION_KEY, isLoggedIn ? "true" : "false");
  $("#adminLogin").classList.toggle("is-hidden", isLoggedIn);
  $("#adminDashboard").classList.toggle("is-hidden", !isLoggedIn);
  if (isLoggedIn) {
    await renderAdminQuestions();
    await renderAdminParticipants();
  }
}

function resetQuestionForm() {
  $("#questionForm").reset();
  $("#editingQuestionId").value = "";
  $("#adminQuestionType").value = "mcq";
  $("#questionStream").value = "";
  $("#optionsField").classList.remove("is-hidden");
}

async function exportParticipantsCsv() {
  const participants = await getParticipants();
  const headers = ["Name", "Phone", "Stream", "Score", "Total", "Correct", "Completed"];
  const rows = participants.map((participant) => [
    participant.name,
    participant.phone,
    participant.stream || "",
    participant.score,
    participant.total,
    participant.correct,
    participant.completed_at,
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

$("#startForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const questions = await getQuestions();
  if (!questions.length) {
    alert("No questions are active. Please ask admin to add questions.");
    return;
  }

  const name = $("#contestantName").value.trim();
  const phone = $("#contestantPhone").value.trim();
  const stream = $("#stream").value;

  if (!name || !phone || !stream) {
    alert("Please fill all fields");
    return;
  }

  activeContestant = {
    name,
    phone,
    stream,
  };

  await renderQuizQuestions();
  $("#quizContestant").textContent = activeContestant.name;
  $("#quizProgress").textContent = `1 question loaded`;
  $("#startForm").classList.add("is-hidden");
  $("#quizForm").classList.remove("is-hidden");
});

$("#quizForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  console.log("quizForm submit event");

  try {
    const formData = new FormData(document.getElementById("quizForm"));
    let correct = 0;

    if (activeQuestion) {
      const value = formData.get(`answer-${activeQuestion.id}`);
      const given = normalizeAnswer(value);
      const expected = normalizeAnswer(activeQuestion.answer ?? activeQuestion.correctAnswer ?? "");
      if (given === expected) correct = 1;
    }

    const participant = {
      id: crypto.randomUUID(),
      name: activeContestant.name,
      phone: activeContestant.phone,
      stream: activeContestant.stream,
      score: correct,
      correct,
      total: 1,
      completed_at: new Date().toISOString(),
    };

    await saveParticipantToDB(participant);
    const data = await getParticipantsFromDB();
    console.log("Participants after insert:", data);

    $("#quizForm").classList.add("is-hidden");
    $("#resultPanel").classList.remove("is-hidden");
    $("#resultTitle").textContent = `${participant.name}, your score is saved`;
    $("#resultCopy").textContent = "Your score has been saved.";
    $("#resultScore").textContent = `${correct}/1`;
    await renderStats();
  } catch (err) {
    console.error("Error during quiz submit:", err);
    alert("Failed to submit quiz. Check console for details.");
  }
});

$("#cancelQuiz").addEventListener("click", showStartPanel);
$("#newRun").addEventListener("click", showStartPanel);

$("#clearAdminScores").addEventListener("click", async () => {
  if (!confirm("Delete ALL participant scores?")) return;

  const { error } = await supabaseClient
    .from("participants")
    .delete()
    .neq("id", "");

  if (error) {
    console.error(error);
    alert("Failed to clear scores");
    return;
  }

  await renderAdminParticipants();
  await renderStats();
});

$("#adminLogin").addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = $("#adminUser").value.trim();
  const password = $("#adminPass").value;
  const isValid = username === ADMIN_USERNAME && password === ADMIN_PASSWORD;

  $("#loginError").textContent = isValid ? "" : "Invalid admin login details.";
  if (isValid) await setAdminState(true);
});

$("#adminLogout").addEventListener("click", async () => {
  await setAdminState(false);
});

$("#adminQuestionType").addEventListener("change", (event) => {
  $("#optionsField").classList.toggle("is-hidden", event.target.value !== "mcq");
});

$("#questionForm").addEventListener("submit", async (event) => {
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

  const stream = $("#questionStream").value;
  if (!stream) {
    alert("Please select a stream for this question.");
    return;
  }

  const question = {
    id,
    type,
    question: $("#adminQuestion").value.trim(),
    options: type === "mcq" ? options : [],
    answer,
    stream,
  };

  const questions = await getQuestions();
  const existingIndex = questions.findIndex((item) => item.id === id);
  if (existingIndex >= 0) {
    questions[existingIndex] = question;
  } else {
    questions.push(question);
  }

  await saveQuestions(questions);
  resetQuestionForm();
  await renderAdminQuestions();
  await renderStats();
});

$("#resetQuestionForm").addEventListener("click", resetQuestionForm);

$("#adminQuestionList").addEventListener("click", async (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  const questions = await getQuestions();

  if (editId) {
    const question = questions.find((item) => item.id === editId);
    if (!question) return;
    $("#editingQuestionId").value = question.id;
    $("#adminQuestion").value = question.question;
    $("#adminQuestionType").value = question.type;
    $("#adminOptions").value = question.options.join("\n");
    $("#adminAnswer").value = question.answer;
    $("#questionStream").value = question.stream || "";
    $("#optionsField").classList.toggle("is-hidden", question.type !== "mcq");
    $("#adminQuestion").focus();
  }

  if (deleteId) {
    if (!confirm("Delete this question?")) return;
    await saveQuestions(questions.filter((item) => item.id !== deleteId));
    await renderAdminQuestions();
    await renderStats();
  }
});

$("#restoreDummyQuestions").addEventListener("click", async () => {
  await saveQuestions(dummyQuestions.map((question) => ({ ...question, id: crypto.randomUUID() })));
  resetQuestionForm();
  await renderAdminQuestions();
  await renderStats();
});

$("#exportParticipants").addEventListener("click", exportParticipantsCsv);

(async () => {
  await renderStats();
})();
setAdminState(localStorage.getItem(ADMIN_SESSION_KEY) === "true");
async function testConnection() {
  const { data, error } = await supabaseClient
  .from("participants")
  .select("*");
  console.log("DATA:", data);
  console.log("ERROR:", error);
}

testConnection();

// Realtime subscription for questions table to live-sync UI
supabaseClient
  .channel("questions")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "questions",
    },
    async () => {
      await renderQuizQuestions();
    }
  )
  .subscribe();