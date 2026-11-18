/* AP Psychology practice questions: window.APPSYCH_QUESTIONS
 * At least one question per term in terms.js (linked by `term`). Written for this site; no copied exam or textbook items.
 * difficulty: 1 (one clear cue) to 5 (multi-step reasoning with subtle, partly true distractors).
 * Games shuffle `choices` (keeping `answer` and `feedback` aligned) unless `shuffle` is false.
 * status: "draft" (not yet reviewed) or "live" (reviewed); games use both. "omitted" questions are skipped by every game.
 * choiceRefs: the term id each choice names or illustrates (null if none), in choice order; games list
 *   these under "Terms used in this question" after the answer is shown (shared/term-help.js).
 * figure (optional): data for a scatterplot, bar graph or line graph drawn by shared/figures.js;
 *   the format is described at the top of that file.
 */
window.APPSYCH_QUESTIONS = [
  // ===== Science Practices =====
  // perspectives
  {
    id: "q-psychology-1",
    status: "draft",
    term: "psychology",
    ced: ["0.1"],
    skills: ["1.A"],
    style: "explain",
    difficulty: 3,
    stem: "Mateo tells his friend that psychology is just common sense, because most of its findings seem obvious once people hear them. Which of the following best explains why psychologists still test ideas that seem obvious?",
    choices: [
      "Psychology studies only observable behavior, so common sense about thoughts and feelings does not apply.",
      "Mental processes cannot be measured directly, so psychologists must rely on research about behavior instead.",
      "Ideas that seem obvious after the fact are sometimes wrong, so they must be tested systematically.",
      "Common-sense ideas come from the psychodynamic perspective, which modern psychologists no longer accept."
    ],
    answer: 2,
    choiceRefs: [null, null, "hindsight-bias", "psychodynamic-perspective"],
    hint: "Think about how an outcome feels once you already know it.",
    explanation: "Many \"obvious\" results only seem obvious after people hear them, and some common-sense beliefs turn out to be false. Psychology is a science because it tests ideas systematically rather than trusting intuition.",
    feedback: [
      "Psychology studies both behavior and mental processes, so thoughts and feelings are part of the field, not outside it.",
      "Psychologists do study mental processes scientifically, using reaction times, ratings, and brain scans; that isn't why obvious ideas need testing.",
      "Correct: findings feel obvious once known, but some common-sense beliefs turn out to be false, so psychology tests them scientifically.",
      "Common sense isn't tied to any one perspective, and every perspective in psychology relies on testing ideas with research."
    ]
  },
  {
    id: "q-psychodynamic-perspective-1",
    status: "draft",
    term: "psychodynamic-perspective",
    ced: ["0.1", "5.3.B.3"],
    skills: ["1.A"],
    style: "scenario",
    difficulty: 1,
    stem: "Dr. Haddad believes that Leo's intense fear of being abandoned by his friends comes from conflicts with his parents in early childhood that Leo is not consciously aware of. Dr. Haddad's explanation best reflects which perspective?",
    choices: ["Psychodynamic", "Humanistic", "Cognitive", "Behavioral"],
    answer: 0,
    choiceRefs: ["psychodynamic-perspective", "humanistic-perspective", "cognitive-perspective", "behavioral-perspective"],
    hint: "Notice that Leo is not aware of what is driving his fear.",
    explanation: "Dr. Haddad points to unconscious conflicts rooted in early childhood, which is how the psychodynamic perspective explains behavior.",
    feedback: [
      "Correct: tracing a fear to unconscious conflicts from early childhood is the core of the psychodynamic perspective.",
      "The humanistic perspective focuses on personal growth and unmet potential, not hidden childhood conflicts.",
      "The cognitive perspective would focus on Leo's current conscious thoughts, such as how he interprets his friends' actions.",
      "The behavioral perspective would look for learned associations or consequences, not unconscious conflicts."
    ]
  },
  {
    id: "q-behavioral-perspective-1",
    status: "draft",
    term: "behavioral-perspective",
    ced: ["0.1", "3.7.A.1"],
    skills: ["1.A"],
    style: "prediction",
    difficulty: 2,
    stem: "Dr. Brennan uses the behavioral perspective to study why 4-year-old Sofia throws tantrums at the grocery store. Which of the following is Dr. Brennan most likely to investigate?",
    choices: [
      "Sofia's beliefs about what is fair when she is told no",
      "Differences in Sofia's brain activity during tantrums",
      "Sofia's unconscious feelings of anger toward her parents",
      "What usually happens right after Sofia's tantrums begin"
    ],
    answer: 3,
    choiceRefs: ["cognitive-perspective", "biological-perspective", "psychodynamic-perspective", "behavioral-perspective"],
    hint: "Behaviorists focus on what can be observed in the environment.",
    explanation: "The behavioral perspective explains behavior through learning from the environment. Dr. Brennan would look at the observable consequences that follow tantrums, such as a parent giving in.",
    feedback: [
      "Beliefs about fairness are mental processes studied by the cognitive perspective; behaviorists focus on observable behavior and its consequences.",
      "Brain activity is the focus of the biological perspective, not the behavioral perspective.",
      "Unconscious feelings are the focus of the psychodynamic perspective; behaviorists avoid explanations based on unobservable inner states.",
      "Correct: behaviorists look at observable consequences, such as getting candy after a tantrum, that strengthen the behavior."
    ]
  },
  {
    id: "q-humanistic-perspective-1",
    status: "draft",
    term: "humanistic-perspective",
    ced: ["0.1", "4.4.B.1"],
    skills: ["1.A"],
    style: "scenario",
    difficulty: 2,
    stem: "Ms. Alvarez, a school counselor, tells Kofi, who is failing two classes, that she values him no matter what grades he earns and that she believes he can grow into the person he wants to become. Ms. Alvarez's approach best reflects which perspective?",
    choices: ["Cognitive", "Humanistic", "Psychodynamic", "Sociocultural"],
    answer: 1,
    choiceRefs: ["cognitive-perspective", "humanistic-perspective", "psychodynamic-perspective", "sociocultural-perspective"],
    hint: "Focus on her acceptance of Kofi and her belief in his potential.",
    explanation: "Ms. Alvarez offers acceptance that doesn't depend on Kofi's grades and emphasizes his capacity for growth, both hallmarks of the humanistic perspective.",
    feedback: [
      "A cognitive approach would target Kofi's thinking patterns, such as challenging a belief that he is bad at school.",
      "Correct: accepting Kofi regardless of his grades and trusting his drive to grow are central to the humanistic perspective.",
      "A psychodynamic approach would explore unconscious conflicts from Kofi's childhood, which Ms. Alvarez doesn't mention.",
      "A sociocultural approach would focus on how friends, family, or culture shape Kofi's behavior."
    ]
  },
  {
    id: "q-biological-perspective-1",
    status: "draft",
    term: "biological-perspective",
    ced: ["0.1"],
    skills: ["1.A"],
    style: "scenario",
    difficulty: 1,
    stem: "After a car accident damaged part of his frontal lobe, Marcus began making impulsive decisions he never would have made before. His doctor explains the change as a result of the injury to his brain tissue. The doctor's explanation reflects which perspective?",
    choices: ["Cognitive", "Biological", "Evolutionary", "Psychodynamic"],
    answer: 1,
    choiceRefs: ["cognitive-perspective", "biological-perspective", "evolutionary-perspective", "psychodynamic-perspective"],
    hint: "What kind of cause does the doctor point to?",
    explanation: "The doctor attributes Marcus's impulsivity to physical damage in the brain, which is how the biological perspective explains behavior.",
    feedback: [
      "The cognitive perspective would explain the change through Marcus's thoughts or beliefs, not through damage to brain tissue.",
      "Correct: explaining a change in behavior through physical damage to the brain reflects the biological perspective.",
      "The evolutionary perspective asks how a behavior helped ancestors survive and reproduce, not how an injury changed one person.",
      "The psychodynamic perspective focuses on unconscious conflicts, not physical injuries to the brain."
    ]
  },
  {
    id: "q-cognitive-perspective-1",
    status: "draft",
    term: "cognitive-perspective",
    ced: ["0.1", "5.3.B.5"],
    skills: ["1.A"],
    style: "scenario",
    difficulty: 3,
    stem: "Jaylen believes that if he makes a single mistake at his piano recital, everyone in the audience will decide he is a failure. A psychologist explains that this way of interpreting situations is the main cause of Jaylen's anxiety. The psychologist's explanation best reflects which perspective?",
    choices: ["Behavioral", "Psychodynamic", "Humanistic", "Cognitive"],
    answer: 3,
    choiceRefs: ["behavioral-perspective", "psychodynamic-perspective", "humanistic-perspective", "cognitive-perspective"],
    hint: "Look at what the psychologist identifies as the cause.",
    explanation: "The psychologist says Jaylen's interpretation of situations causes his anxiety. Explaining problems through thoughts and beliefs is the cognitive perspective.",
    feedback: [
      "A behavioral explanation would focus on learned associations or consequences, such as a past recital that went badly, not on how Jaylen interprets events.",
      "A psychodynamic explanation would look for unconscious conflicts; Jaylen's belief is a conscious thought he can describe.",
      "A humanistic explanation would focus on unmet potential or conditional acceptance, not on a specific distorted belief.",
      "Correct: the psychologist traces the anxiety to Jaylen's maladaptive way of thinking, which is the cognitive perspective."
    ]
  },
  {
    id: "q-sociocultural-perspective-1",
    status: "draft",
    term: "sociocultural-perspective",
    ced: ["0.1"],
    skills: ["1.A"],
    style: "best-example",
    difficulty: 2,
    stem: "Which of the following explanations of teenagers' eating habits best reflects the sociocultural perspective?",
    choices: [
      "Teens eat more fast food when their friends choose it and ads target their age group.",
      "Teens crave sugary foods because sweetness signaled safe, high-energy food for early humans.",
      "Hormones that signal hunger increase during growth spurts and lead teens to eat more.",
      "Teens snack more after learning that snacking reliably relieves boredom after school."
    ],
    answer: 0,
    choiceRefs: ["sociocultural-perspective", "evolutionary-perspective", "biological-perspective", "behavioral-perspective"],
    hint: "Look for the explanation that involves other people and culture.",
    explanation: "The sociocultural perspective explains behavior through other people and culture. Friends' food choices and advertising aimed at teens are both social influences.",
    feedback: [
      "Correct: friends' choices and advertising aimed at teens are social and cultural influences, the focus of the sociocultural perspective.",
      "Linking a craving to ancestors' survival reflects the evolutionary perspective, not the sociocultural perspective.",
      "Explaining eating through hunger hormones reflects the biological perspective.",
      "Learning that a behavior is followed by relief from boredom is a behavioral explanation."
    ]
  },
  {
    id: "q-evolutionary-perspective-1",
    status: "draft",
    term: "evolutionary-perspective",
    ced: ["0.1", "1.1.A.2"],
    skills: ["1.A"],
    style: "prediction",
    difficulty: 1,
    stem: "A psychologist using the evolutionary perspective wants to explain why fear of snakes is common around the world. Which of the following questions is the psychologist most likely to ask?",
    choices: [
      "Which brain structures become active when a person sees a snake?",
      "Did people learn to fear snakes after frightening experiences?",
      "How might fearing snakes have helped early humans survive?",
      "How do people's thoughts about snakes make their fear worse?"
    ],
    answer: 2,
    choiceRefs: ["biological-perspective", "behavioral-perspective", "evolutionary-perspective", "cognitive-perspective"],
    hint: "Think about the perspective that looks back across many generations.",
    explanation: "The evolutionary perspective explains common traits by how they helped ancestors survive and reproduce. Ancestors who avoided snakes were less likely to be bitten and more likely to pass on that tendency.",
    feedback: [
      "Asking which brain structures are involved reflects the biological perspective.",
      "Asking whether fear came from frightening experiences reflects the behavioral perspective, which focuses on learning.",
      "Correct: the evolutionary perspective asks how a trait helped ancestors survive and reproduce, so that it was passed on.",
      "Asking how thoughts increase fear reflects the cognitive perspective."
    ]
  },
  {
    id: "q-cultural-norms-1",
    status: "draft",
    term: "cultural-norms",
    ced: ["0.1", "5.3.A.1", "5.3.A.2"],
    skills: ["1.B"],
    style: "explain",
    difficulty: 3,
    stem: "Before deciding whether a client's behavior is part of a psychological disorder, Dr. Mwangi asks whether the behavior is typical in the client's culture. Which of the following best explains why she does this?",
    choices: [
      "A person's culture determines which psychological disorders the person can inherit.",
      "Behaviors that are common in a culture cannot cause distress or problems in daily life.",
      "Psychologists must judge every client by the norms of the psychologist's own culture.",
      "A behavior that seems unusual in one culture may be expected and healthy in another."
    ],
    answer: 3,
    choiceRefs: [null, null, null, "cultural-norms"],
    hint: "Deviation from social norms is one factor used to identify disorders, but whose norms?",
    explanation: "Cultural norms set expectations for behavior, so a behavior that seems strange in one culture may be normal in another. Checking the client's culture helps avoid mistaking normal behavior for a disorder.",
    feedback: [
      "Culture shapes expectations for behavior, but it doesn't determine which disorders a person can inherit.",
      "Common behaviors can still cause distress or dysfunction; Dr. Mwangi is checking for deviation from norms, not ruling out other factors.",
      "Judging clients by the psychologist's own culture could lead to misdiagnosis, which is exactly what Dr. Mwangi is trying to avoid.",
      "Correct: what counts as deviant depends on cultural norms, so behavior must be judged against the client's own culture."
    ]
  },

  // research-methods
  {
    id: "q-research-design-1",
    status: "draft",
    term: "research-design",
    ced: ["0.2"],
    skills: ["2.A"],
    style: "research",
    difficulty: 1,
    stem: "Dr. Mensah wants to find out whether a new reading app causes second graders to earn higher reading scores. Which research design would best allow her to reach this conclusion?",
    choices: ["Experiment", "Correlational study", "Case study", "Naturalistic observation"],
    answer: 0,
    choiceRefs: ["experiment", "correlation", "case-study", "naturalistic-observation"],
    hint: "Look closely at the word \"causes\" in her question.",
    explanation: "Dr. Mensah's question is about cause and effect. Only an experiment, which manipulates an independent variable and randomly assigns participants, can answer it.",
    feedback: [
      "Correct: only an experiment, with app use manipulated and students randomly assigned, can show cause and effect.",
      "A correlational study could show whether app use and scores are related, but it can't show that the app causes higher scores.",
      "A case study examines one child in depth and can't show what causes scores to rise for second graders in general.",
      "Watching students in class could describe reading behavior, but without manipulating app use it can't show cause and effect."
    ]
  },
  {
    id: "q-experiment-1",
    status: "draft",
    term: "experiment",
    ced: ["0.2"],
    skills: ["2.A"],
    style: "compare",
    difficulty: 3,
    stem: "Which of the following statements best distinguishes an experiment from a correlational study?",
    choices: [
      "Only an experiment uses numbers, so its results are more precise.",
      "Only an experiment manipulates a variable, so it can test cause and effect.",
      "Only a correlational study measures two variables, so it can show which causes the other.",
      "Only a correlational study uses a sample, so its results can be generalized."
    ],
    answer: 1,
    choiceRefs: [null, "experiment", "correlation", "sample"],
    hint: "Think about what the researcher does to the variables, not just how they are measured.",
    explanation: "An experiment manipulates an independent variable and randomly assigns participants, which allows cause-and-effect conclusions. A correlational study only measures how variables relate.",
    feedback: [
      "Both methods usually collect numerical data, so using numbers isn't what separates them.",
      "Correct: manipulating an independent variable, with random assignment, is what lets an experiment test cause and effect.",
      "Correlational studies do measure two variables, but they cannot show which one causes the other.",
      "Both methods use samples drawn from a population; whether results generalize depends on how the sample was chosen."
    ]
  },
  {
    id: "q-hypothesis-1",
    status: "draft",
    term: "hypothesis",
    ced: ["0.2"],
    skills: ["2.B"],
    style: "research",
    difficulty: 2,
    stem: "Dr. Brooks is planning a study on whether chewing gum during a test improves memory. Which of the following is the best hypothesis for her study?",
    choices: [
      "Chewing gum might or might not have some kind of effect on students' memory.",
      "Memory is the ability to encode, store, and retrieve information over time.",
      "Students who chew gum during a test will recall more words than those who don't.",
      "Students who regularly chew gum during tests are generally happier than students who don't."
    ],
    answer: 2,
    choiceRefs: [null, null, "hypothesis", null],
    hint: "A good hypothesis is a specific, testable prediction that matches the research question.",
    explanation: "A hypothesis is a testable prediction about how variables relate. This one names the variable being tested (gum chewing) and a measurable outcome (words recalled).",
    feedback: [
      "No result could contradict \"might or might not,\" so this can't be tested; a hypothesis makes a specific prediction.",
      "This is a definition of memory, not a testable prediction about how chewing gum relates to memory.",
      "Correct: it makes a specific, testable prediction about how gum chewing affects the number of words recalled.",
      "This is testable, but it predicts happiness rather than memory, so it doesn't fit Dr. Brooks's research question."
    ]
  },
  {
    id: "q-theory-1",
    status: "draft",
    term: "theory",
    ced: ["0.2"],
    skills: ["2.B"],
    style: "scenario",
    difficulty: 3,
    stem: "After reviewing many studies showing that people remember more when practice is spread out, Dr. Lin proposes a broad explanation of why spacing helps memory. She then predicts that students who take weekly quizzes will score higher on a final exam than students who take one review quiz. Dr. Lin's broad explanation and her specific prediction are best described as",
    choices: [
      "a theory and a hypothesis, respectively",
      "a hypothesis and a theory, respectively",
      "a theory and an operational definition, respectively",
      "a replication and a hypothesis, respectively"
    ],
    answer: 0,
    choiceRefs: ["theory", "hypothesis", "operational-definitions", "replication"],
    hint: "Which statement is broader, and which one could be tested in a single study?",
    explanation: "A theory organizes many observations into a broad explanation and produces hypotheses. Dr. Lin's prediction about weekly quizzes is a specific, testable hypothesis drawn from her theory.",
    feedback: [
      "Correct: a broad explanation that organizes many findings is a theory, and the testable prediction drawn from it is a hypothesis.",
      "This reverses the terms: the broad explanation organizing many findings is the theory, and the specific prediction is the hypothesis.",
      "An operational definition describes exactly how a variable is measured, such as \"score on a 50-item final exam,\" not a prediction.",
      "A replication repeats an earlier study; Dr. Lin is proposing a new explanation, not repeating a study."
    ]
  },
  {
    id: "q-falsifiable-1",
    status: "draft",
    term: "falsifiable",
    ced: ["0.2"],
    skills: ["2.B"],
    style: "best-example",
    difficulty: 3,
    stem: "Students in Ms. Park's class submitted hypotheses for a research project. Which of the following hypotheses is falsifiable?",
    choices: [
      "Every person has an invisible energy that guides behavior in ways no test can detect.",
      "Some people may sometimes behave differently when they are around other people.",
      "Dreams are secret messages from a part of the mind that can never be observed.",
      "Students who sleep 8 hours will outscore students who sleep 5 hours on a math quiz."
    ],
    answer: 3,
    choiceRefs: [null, null, null, "falsifiable"],
    hint: "Ask which statement a study's results could actually contradict.",
    explanation: "A falsifiable hypothesis could be shown wrong by evidence. The sleep hypothesis makes a specific prediction that quiz scores could contradict; the other statements fit any possible result.",
    feedback: [
      "Because this energy can't be detected by any test, no result could ever show the claim is wrong.",
      "\"Some people may sometimes\" fits any possible result, so no finding could contradict it.",
      "If this part of the mind can never be observed, no evidence could show the claim is false.",
      "Correct: if students who slept 5 hours scored the same or higher, the hypothesis would be shown wrong, so it is falsifiable."
    ]
  },
  {
    id: "q-operational-definitions-1",
    status: "draft",
    term: "operational-definitions",
    ced: ["0.2"],
    skills: ["2.B"],
    style: "research",
    difficulty: 3,
    stem: "Dr. Chen is testing whether 20 minutes of exercise reduces stress in college students. Which of the following is the best operational definition of stress for her study?",
    choices: [
      "How tense, worried, or overwhelmed participants feel in their daily lives",
      "Scores on a 10-item stress questionnaire given after a timed math task",
      "The body's natural reaction to demanding or threatening events",
      "Whether participants report exercising at least three times per week"
    ],
    answer: 1,
    choiceRefs: [null, "operational-definitions", null, null],
    hint: "Which option tells another researcher exactly how to measure stress?",
    explanation: "An operational definition states precisely how a variable is measured. A specific questionnaire score after a specific task lets other researchers replicate the study.",
    feedback: [
      "This describes stress in general terms but doesn't say how it will be measured, so another researcher couldn't replicate it exactly.",
      "Correct: it states exactly how stress will be measured, so other researchers could repeat the study.",
      "This is a general description of stress, not a statement of how the study will measure it.",
      "This describes exercise habits, which relate to the independent variable, not a measure of stress."
    ]
  },
  {
    id: "q-replication-1",
    status: "draft",
    term: "replication",
    ced: ["0.2"],
    skills: ["2.B"],
    style: "research",
    difficulty: 3,
    stem: "Dr. Fischer found that students who studied with background music recalled more words than students who studied in silence. Five other research teams then repeated her exact procedure with new participants, and none found a difference between the groups. Which of the following is the most appropriate conclusion?",
    choices: [
      "The original study is still the most accurate because it was published first.",
      "The later studies failed because they used different participants.",
      "The original finding is doubtful because it was not replicated.",
      "Background music improves memory only for the participants in Dr. Fischer's sample."
    ],
    answer: 2,
    choiceRefs: [null, null, "replication", "generalization"],
    hint: "Think about what it means when repeated studies don't match the original.",
    explanation: "Replication tests whether a result holds up with new participants. When five careful repetitions find no effect, the original finding is likely unreliable.",
    feedback: [
      "Being published first doesn't make a result more accurate; repeated failures to find the effect weaken confidence in it.",
      "Using new participants is the point of replication; a real effect should appear with different people.",
      "Correct: when several careful repetitions fail to find an effect, the original result may have been due to chance or a flaw.",
      "The evidence doesn't show the effect is real even for her sample, since the original result may have been due to chance."
    ]
  },
  {
    id: "q-case-study-1",
    status: "draft",
    term: "case-study",
    ced: ["0.2"],
    skills: ["2.A", "2.C"],
    style: "research",
    difficulty: 4,
    stem: "Dr. Lindqvist wants to learn as much as possible about a 12-year-old girl with a rare condition that prevents her from feeling fear. Over two years, he interviews the girl, her family, and her teachers and gives her dozens of tests. Which of the following is the main limitation of this method?",
    choices: [
      "Findings about one person may not apply to other people.",
      "It provides too little detail about the girl's life.",
      "It requires randomly assigning the girl to a group.",
      "It can collect only numerical data, not descriptions."
    ],
    answer: 0,
    choiceRefs: ["generalization", null, "random-assignment", "quantitative-measures"],
    hint: "First identify the method, then think about how many people it studies.",
    explanation: "Studying one person in great depth is a case study. Because the girl's condition is rare, what is learned about her may not generalize to other people.",
    feedback: [
      "Correct: a case study examines one person in depth, so its findings may not generalize to others.",
      "Case studies provide a great deal of detail; that depth is their main strength, not a limitation.",
      "Random assignment is part of experiments; a case study of one person has no groups to assign.",
      "Case studies often gather rich qualitative data, such as interviews, along with test scores."
    ]
  },
  {
    id: "q-correlation-1",
    status: "draft",
    term: "correlation",
    ced: ["0.2"],
    skills: ["2.C"],
    style: "research",
    difficulty: 3,
    stem: "Researchers surveyed 1,200 teens and found a strong positive correlation between hours spent on social media each day and loneliness scores. Which of the following conclusions is best supported by these results?",
    choices: [
      "Spending time on social media causes teens to feel lonely.",
      "Feeling lonely causes teens to spend more time on social media.",
      "Teens who cut back on social media will become less lonely.",
      "Teens who use more social media tend to report more loneliness."
    ],
    answer: 3,
    choiceRefs: [null, null, null, "correlation"],
    hint: "Ask what a correlation can and cannot tell you.",
    explanation: "A positive correlation means higher social media use tends to go with higher loneliness. Because no variable was manipulated, the results can't show cause and effect in either direction.",
    feedback: [
      "A correlation can't show that social media causes loneliness; the relationship could run the other way or reflect a third variable.",
      "This might be true, but a correlation can't show causation in this direction either.",
      "This predicts the effect of changing social media use, which only an experiment could test.",
      "Correct: a positive correlation shows that the two variables tend to rise together, without showing what causes what."
    ]
  },
  {
    id: "q-naturalistic-observation-1",
    status: "draft",
    term: "naturalistic-observation",
    ced: ["0.2"],
    skills: ["2.A"],
    style: "research",
    difficulty: 1,
    stem: "Dr. Abara wants to study how often preschoolers share toys during free play. Which of the following plans would be naturalistic observation?",
    choices: [
      "Asking teachers to rate each child's sharing on a 1–5 scale",
      "Teaching half the children a sharing lesson and comparing the two groups",
      "Recording sharing from behind a one-way window during normal playtime",
      "Interviewing one child in depth about why she shares her toys"
    ],
    answer: 2,
    choiceRefs: ["survey", "experiment", "naturalistic-observation", "case-study"],
    hint: "Look for the plan in which the researcher watches without changing anything.",
    explanation: "Naturalistic observation records behavior in its natural setting without interfering. Watching normal playtime from behind a one-way window does exactly that.",
    feedback: [
      "Teacher ratings are a survey-style measure, not direct observation of the children in their natural setting.",
      "Giving one group a lesson manipulates a variable, which makes this an experiment.",
      "Correct: watching and recording behavior in its usual setting without interfering is naturalistic observation.",
      "Studying one child in depth is a case study."
    ]
  },
  {
    id: "q-survey-1",
    status: "draft",
    term: "survey",
    ced: ["0.2"],
    skills: ["2.C"],
    style: "research",
    difficulty: 1,
    stem: "Dr. Patel wants to estimate how many hours of homework high school students across her state complete each week. Which method would let her collect this information from the largest number of students most efficiently?",
    choices: ["Case study", "Survey", "Naturalistic observation", "Experiment"],
    answer: 1,
    choiceRefs: ["case-study", "survey", "naturalistic-observation", "experiment"],
    hint: "She wants a lot of information from a lot of people, quickly.",
    explanation: "A survey collects self-reported information from many people through questionnaires, making it the most efficient way to estimate homework time across a state.",
    feedback: [
      "A case study examines one person in depth, so it can't estimate homework time across a whole state.",
      "Correct: questionnaires let researchers collect self-reported information from many people quickly.",
      "Watching students do homework at home would be slow and impractical for students across a state.",
      "An experiment manipulates a variable to test cause and effect, but Dr. Patel only wants to describe homework habits."
    ]
  },
  {
    id: "q-meta-analysis-1",
    status: "draft",
    term: "meta-analysis",
    ced: ["0.2", "5.5.A.1"],
    skills: ["2.A"],
    style: "research",
    difficulty: 3,
    stem: "Dr. Russo gathers 85 published studies on whether psychotherapy reduces symptoms of depression. He statistically combines their results and reports one overall estimate of how effective therapy is. Which method did Dr. Russo use?",
    choices: ["Meta-analysis", "Replication", "Correlational study", "Survey"],
    answer: 0,
    choiceRefs: ["meta-analysis", "replication", "correlation", "survey"],
    hint: "Notice that Dr. Russo didn't collect any new data from participants.",
    explanation: "Dr. Russo combined the results of 85 existing studies to reach an overall conclusion, which is a meta-analysis.",
    feedback: [
      "Correct: statistically combining the results of many studies on the same question is a meta-analysis.",
      "Replication means repeating one study with new participants; Dr. Russo combined existing studies instead of running a new one.",
      "A correlational study measures how two variables relate in one set of participants, not across many published studies.",
      "A survey collects self-reports from participants, but Dr. Russo analyzed results from published studies."
    ]
  },
  {
    id: "q-structured-interviews-1",
    status: "draft",
    term: "structured-interviews",
    ced: ["0.2"],
    skills: ["2.B", "2.C"],
    style: "research",
    difficulty: 4,
    stem: "Dr. Nguyen and three assistants will interview first-year teachers at ten schools about their biggest challenges. She wants rich descriptions in the teachers' own words, and she wants answers to be comparable across interviewers. Which approach best meets both goals?",
    choices: [
      "Letting each interviewer choose questions based on how the conversation goes",
      "Having each teacher rate their stress level on a scale from 1 to 7",
      "Asking every teacher the same open-ended questions in the same order",
      "Watching teachers in their classrooms without speaking to them"
    ],
    answer: 2,
    choiceRefs: [null, "likert-scale", "structured-interviews", "naturalistic-observation"],
    hint: "One goal calls for qualitative answers; the other calls for consistency.",
    explanation: "In a structured interview, every participant gets the same questions in the same order, so answers can be compared. Open-ended questions still yield qualitative descriptions.",
    feedback: [
      "Varying the questions gives rich answers, but different interviewers would ask different things, so answers couldn't be compared.",
      "A rating scale makes answers comparable, but it yields numbers, not descriptions in the teachers' own words.",
      "Correct: a structured interview keeps questions identical across interviewers, while open-ended questions capture qualitative descriptions.",
      "Observation records behavior but doesn't capture teachers' own descriptions of their challenges."
    ]
  },
  {
    id: "q-qualitative-measures-1",
    status: "draft",
    term: "qualitative-measures",
    ced: ["0.2"],
    skills: ["2.B", "2.C"],
    style: "research",
    difficulty: 2,
    stem: "Dr. Ellis is studying students' experiences after they transfer to a new high school. Which of the following would give her qualitative data?",
    choices: [
      "The number of friends each student lists after one month",
      "Each student's rating of belonging on a scale from 1 to 5",
      "Attendance records for each student's first semester",
      "Students' written descriptions of their first week at school"
    ],
    answer: 3,
    choiceRefs: ["quantitative-measures", "likert-scale", "quantitative-measures", "qualitative-measures"],
    hint: "Look for data that would be words rather than numbers.",
    explanation: "Qualitative data are words, descriptions, or observations rather than numbers. Students' written descriptions of their first week fit; the other options are counts or ratings.",
    feedback: [
      "A count of friends is a number, which makes it quantitative data.",
      "A rating on a 1-to-5 scale produces numbers, so it is quantitative, even though it measures feelings.",
      "Attendance records are counts of days, which are quantitative data.",
      "Correct: written descriptions are words rather than numbers, which makes them qualitative data."
    ]
  },
  {
    id: "q-quantitative-measures-1",
    status: "draft",
    term: "quantitative-measures",
    ced: ["0.2"],
    skills: ["2.B", "2.C"],
    style: "research",
    difficulty: 2,
    stem: "Dr. Yusuf asked coaches to describe each player's leadership in their own words. A colleague suggests switching to a quantitative measure. Which change would accomplish this?",
    choices: [
      "Asking coaches to write longer and more detailed descriptions",
      "Counting how often each player directs teammates at practice",
      "Recording the coaches' spoken descriptions on video instead of paper",
      "Interviewing the players about leadership instead of the coaches"
    ],
    answer: 1,
    choiceRefs: ["qualitative-measures", "quantitative-measures", "qualitative-measures", "qualitative-measures"],
    hint: "Which option would produce numbers instead of words?",
    explanation: "Quantitative measures produce numbers. Counting how often each player directs teammates turns leadership into data that can be analyzed statistically.",
    feedback: [
      "Longer descriptions are still words, so the data would remain qualitative.",
      "Correct: counting a specific behavior produces numbers that can be analyzed statistically, which is quantitative data.",
      "Changing how descriptions are recorded doesn't change what they are; spoken descriptions on video are still qualitative.",
      "Interviewing players changes who gives the descriptions, but the data would still be words rather than numbers."
    ]
  },
  {
    id: "q-likert-scale-1",
    status: "draft",
    term: "likert-scale",
    ced: ["0.2"],
    skills: ["2.B", "2.C"],
    style: "best-example",
    difficulty: 1,
    stem: "Ms. Torres is writing a survey about homework. Which of the following items uses a Likert scale?",
    choices: [
      "\"Homework helps me learn.\" Circle 1 (strongly disagree) to 5 (strongly agree).",
      "How many hours of homework did you complete last night?",
      "In a few sentences, describe how you feel about homework.",
      "Do you usually complete homework before or after dinner?"
    ],
    answer: 0,
    choiceRefs: ["likert-scale", "quantitative-measures", "qualitative-measures", null],
    hint: "Look for an item that asks how much the student agrees.",
    explanation: "A Likert scale asks people to rate how much they agree or disagree with a statement. Only the first item does this.",
    feedback: [
      "Correct: rating agreement with a statement on a numbered disagree-to-agree scale is a Likert scale.",
      "This asks for a count of hours, which is quantitative but isn't a rating of agreement.",
      "This open-ended item produces written, qualitative answers, not ratings on a scale.",
      "This item offers two categories to choose from, not a range of agreement with a statement."
    ]
  },

  // experimental-design
  {
    id: "q-independent-variables-1",
    status: "draft",
    term: "independent-variables",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "research",
    difficulty: 1,
    stem: "To test whether caffeine affects reaction time, Dr. Bell gives one group of participants a drink containing 200 mg of caffeine and another group a decaffeinated drink. She then measures how quickly each person presses a button when a light flashes. The independent variable is",
    choices: [
      "participants' reaction times",
      "the brightness of the light",
      "whether the drink had caffeine",
      "the number of participants"
    ],
    answer: 2,
    choiceRefs: ["dependent-variables", null, "independent-variables", "sample"],
    hint: "Which factor does Dr. Bell deliberately make different between the groups?",
    explanation: "The independent variable is what the researcher manipulates. Dr. Bell varies whether the drink contains caffeine and then measures reaction time.",
    feedback: [
      "Reaction time is what Dr. Bell measures to see whether it changes, so it is the dependent variable.",
      "The light is the same for everyone; it is part of the procedure, not the variable being manipulated.",
      "Correct: Dr. Bell manipulates whether participants get caffeine, which makes it the independent variable.",
      "The number of participants is the sample size, not a variable the researcher changes between groups."
    ]
  },
  {
    id: "q-dependent-variables-1",
    status: "draft",
    term: "dependent-variables",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "research",
    difficulty: 2,
    stem: "Dr. Soto randomly assigns students to study a list of vocabulary words for 30 minutes, either with flashcards or by rereading their notes. A week later, every student takes the same 20-question quiz, and she records their scores. What is the dependent variable?",
    choices: ["Study method", "Length of the study session", "Random assignment to groups", "Quiz scores"],
    answer: 3,
    choiceRefs: ["independent-variables", null, "random-assignment", "dependent-variables"],
    hint: "What does Dr. Soto measure at the end of the study?",
    explanation: "The dependent variable is the outcome that is measured. Dr. Soto records quiz scores to see whether they differ by study method.",
    feedback: [
      "Study method is what Dr. Soto manipulates, so it is the independent variable.",
      "The 30-minute session is the same for everyone, so it is held constant rather than measured as an outcome.",
      "Random assignment is the procedure for forming groups, not a variable that is measured.",
      "Correct: quiz scores are measured to see whether they depend on the study method."
    ]
  },
  {
    id: "q-confounding-variables-1",
    status: "draft",
    term: "confounding-variables",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "research",
    difficulty: 4,
    stem: "Dr. Larsen tests whether a new math curriculum raises test scores. The class using the new curriculum meets in the morning with a teacher who has 20 years of experience; the class using the old curriculum meets in the afternoon with a first-year teacher. The new-curriculum class scores higher. Which of the following is the most serious problem with concluding that the curriculum caused the difference?",
    choices: [
      "Test scores are not a valid way to measure math learning.",
      "Teacher experience and class time also differed between the classes.",
      "The old-curriculum class should have received a placebo curriculum.",
      "Neither class knew which curriculum the researchers expected to work."
    ],
    answer: 1,
    choiceRefs: [null, "confounding-variables", "placebo", "single-blind-study"],
    hint: "List everything that was different between the two classes, not just the curriculum.",
    explanation: "The classes differed in teacher experience and time of day as well as curriculum. These confounding variables make it impossible to tell which factor caused the higher scores.",
    feedback: [
      "Test scores are a common, reasonable measure of math learning; the bigger problem is what else differed between the classes.",
      "Correct: teacher experience and time of day are confounding variables, so either could explain the higher scores instead of the curriculum.",
      "A placebo controls for expectations, but it wouldn't fix the differences in teachers and class times.",
      "Keeping participants unaware of the hypothesis helps reduce bias, so it isn't a flaw in the study."
    ]
  },
  {
    id: "q-experimental-group-1",
    status: "draft",
    term: "experimental-group",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "research",
    difficulty: 1,
    stem: "Dr. Moreno studies whether a 10-minute daily meditation app reduces anxiety in nurses. Half of the nurses, chosen at random, use the app for a month, while the other half continue their normal routines. All the nurses then complete an anxiety survey. The nurses who used the app make up the",
    choices: ["experimental group", "control group", "placebo group", "dependent variable"],
    answer: 0,
    choiceRefs: ["experimental-group", "control-group", "placebo", "dependent-variables"],
    hint: "Which nurses received the treatment being tested?",
    explanation: "The experimental group receives the manipulation of the independent variable. Here, that is the nurses who used the meditation app.",
    feedback: [
      "Correct: the experimental group receives the treatment, which here is the meditation app.",
      "The control group is the nurses who continued their normal routines, providing a baseline for comparison.",
      "A placebo group would receive a fake treatment, such as an app with no meditation; no one received a fake app.",
      "The dependent variable is the anxiety score being measured, not a group of participants."
    ]
  },
  {
    id: "q-control-group-1",
    status: "draft",
    term: "control-group",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "explain",
    difficulty: 3,
    stem: "Researchers testing whether a new after-school tutoring program raises grades include a group of students who do not receive tutoring. Which of the following best explains why this group is needed?",
    choices: [
      "It ensures that every student in the study benefits from tutoring equally.",
      "It lets researchers know which students are in which group throughout the study.",
      "It provides a baseline that shows how grades change without tutoring.",
      "It removes the need to randomly assign students to the different groups."
    ],
    answer: 2,
    choiceRefs: [null, null, "control-group", "random-assignment"],
    hint: "Grades might change over a semester for reasons that have nothing to do with tutoring.",
    explanation: "A control group provides a baseline. Comparing tutored students to untutored students shows whether the program, rather than time or other factors, raised grades.",
    feedback: [
      "The untutored group doesn't receive the program at all, so the design isn't meant to let everyone benefit equally.",
      "Researchers track group membership in any study; that is unrelated to why an untutored comparison group is needed.",
      "Correct: grades might rise anyway over a semester, so the control group shows what happens without tutoring.",
      "A control group doesn't replace random assignment, which is still needed to make the groups similar at the start."
    ]
  },
  {
    id: "q-control-group-2",
    status: "draft",
    term: "control-group",
    ced: ["0.3"],
    skills: ["3.C", "2.B"],
    style: "research",
    difficulty: 4,
    stem: "Dr. Mendez randomly assigned adults with anxiety to start an 8-week therapy program or to wait 8 weeks before starting it (the waitlist group). Both groups rated their anxiety every 2 weeks. Which conclusion is best supported by the graph?",
    figure: {
      type: "line",
      title: "Average anxiety rating over 8 weeks",
      alt: "Line graph from week 0 to week 8. The therapy group falls from 8.0 to 4.2. The waitlist group falls slowly from 8.1 to 6.8.",
      x: { label: "Week", min: 0, max: 8, step: 2 },
      y: { label: "Anxiety rating (1 to 10)", min: 0, max: 10, step: 2 },
      series: [
        { "name": "Therapy", "points": [[0, 8], [2, 7.1], [4, 6], [6, 5], [8, 4.2]] },
        { "name": "Waitlist", "points": [[0, 8.1], [2, 7.7], [4, 7.3], [6, 7], [8, 6.8]] }
      ]
    },
    choices: [
      "The therapy caused the entire drop in the therapy group's anxiety.",
      "Anxiety fell in both groups, but it fell much more with therapy.",
      "The therapy had no effect, because anxiety also fell without it.",
      "The waitlist group's anxiety rose while the therapy group's fell."
    ],
    answer: 1,
    choiceRefs: ["control-group", "control-group", null, null],
    hint: "Ask what the waitlist group shows about how anxiety changes without the program.",
    explanation: "The waitlist group improved a little (8.1 to 6.8) with no therapy, so some change happens anyway. The therapy group improved much more (8.0 to 4.2), so the program added a large benefit beyond that baseline.",
    feedback: [
      "The waitlist group also improved by about 1.3 points without therapy, so not all of the therapy group's drop came from the program.",
      "Correct: the waitlist group shows the baseline change, and the therapy group dropped about three times as much.",
      "Some improvement without therapy doesn't erase the effect; the therapy group improved far more than the waitlist group.",
      "Both lines go down; the waitlist group's anxiety fell slowly rather than rising."
    ]
  },
  {
    id: "q-random-assignment-1",
    status: "draft",
    term: "random-assignment",
    ced: ["0.3"],
    skills: ["2.A", "2.B"],
    style: "research",
    difficulty: 3,
    stem: "Dr. Iqbal wants to test whether standing desks improve students' attention in class. Which procedure for deciding which students get standing desks is best?",
    choices: [
      "Letting students who want standing desks volunteer to use them",
      "Giving standing desks to first period and regular desks to sixth period",
      "Giving standing desks to students with the lowest attention scores",
      "Drawing names from a hat to decide which students get standing desks"
    ],
    answer: 3,
    choiceRefs: [null, "confounding-variables", null, "random-assignment"],
    hint: "Which method makes the two groups most alike before the study begins?",
    explanation: "Drawing names randomly assigns students to conditions, so pre-existing differences such as motivation are spread evenly across the groups.",
    feedback: [
      "Volunteers may differ from others in motivation or energy, so differences in attention might not be due to the desks.",
      "Classes at different times of day may differ in alertness, which would create a confounding variable.",
      "Students chosen for low scores would differ from the others from the start and might improve somewhat anyway.",
      "Correct: random assignment gives every student an equal chance of each condition, so the groups start out similar."
    ]
  },
  {
    id: "q-placebo-1",
    status: "draft",
    term: "placebo",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "research",
    difficulty: 2,
    stem: "Dr. Reyes is testing whether a new energy drink improves exam scores. To control for participants' expectations, the control group should receive",
    choices: [
      "no drink, while the experimental group drinks the energy drink",
      "an identical-looking drink without the active ingredients",
      "twice as much of the energy drink as the experimental group",
      "a different brand of energy drink with similar ingredients"
    ],
    answer: 1,
    choiceRefs: ["control-group", "placebo", null, null],
    hint: "Both groups should believe they might be getting the real thing.",
    explanation: "A placebo is an inactive substance that looks like the real treatment. It gives both groups the same expectations, so any difference can be credited to the drink's ingredients.",
    feedback: [
      "With no drink, the control group would have no reason to expect improvement, so expectations would differ between groups.",
      "Correct: a placebo looks like the real treatment but is inactive, so both groups expect a boost.",
      "Doubling the dose would test the effect of amount, not separate the drink's effect from expectations.",
      "Another energy drink with similar ingredients is an active treatment, not a placebo."
    ]
  },
  {
    id: "q-placebo-effect-1",
    status: "draft",
    term: "placebo-effect",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "scenario",
    difficulty: 2,
    stem: "In a study on pain, participants who swallowed sugar pills that they were told were strong painkillers reported much less pain than participants who received no pills. This difference is best explained by",
    choices: ["experimenter bias", "social desirability bias", "the placebo effect", "random assignment"],
    answer: 2,
    choiceRefs: ["experimenter-bias", "social-desirability-bias", "placebo-effect", "random-assignment"],
    hint: "The pills had no active ingredient, so what else could have changed participants' pain?",
    explanation: "Because the sugar pills were inactive, the reduced pain came from participants believing they had taken a painkiller. That is the placebo effect.",
    feedback: [
      "Experimenter bias comes from the researcher's expectations; here, the change came from the participants' own beliefs about the pills.",
      "Social desirability bias involves answering to look good, and nothing suggests participants were trying to impress anyone.",
      "Correct: the sugar pills had no active ingredient, so the drop in pain came from participants' expectations.",
      "Random assignment is a way to form groups; it doesn't cause a difference in pain."
    ]
  },
  {
    id: "q-placebo-effect-2",
    status: "draft",
    term: "placebo-effect",
    ced: ["0.3"],
    skills: ["3.C"],
    style: "research",
    difficulty: 4,
    stem: "Dr. Haruki randomly assigned volunteers to drink coffee with caffeine, decaf coffee they were told contained caffeine, or no drink. Then each person took a reaction-time test, where lower times are faster. Which conclusion is best supported by the graph?",
    figure: {
      type: "bar",
      title: "Average reaction time by group",
      alt: "Bar graph of average reaction time. Caffeine group 285 milliseconds, decaf (told caffeine) group 305, no-drink group 330.",
      x: { label: "Group" },
      y: { label: "Reaction time (ms)", min: 0, max: 350, step: 50 },
      categories: ["Caffeine", "Decaf (told caffeine)", "No drink"],
      series: [
        { "name": "Average reaction time", "values": [285, 305, 330] }
      ],
      showValues: true
    },
    choices: [
      "Expecting caffeine sped people up, and caffeine itself sped them up even more.",
      "Caffeine had no real effect, because the decaf group also reacted faster than the no-drink group.",
      "The decaf group reacted faster than the caffeine group, so expectations mattered more than caffeine.",
      "Expectations had no effect, because the decaf group was slower than the caffeine group."
    ],
    answer: 0,
    choiceRefs: ["placebo-effect", "placebo-effect", null, "placebo-effect"],
    hint: "Compare the decaf group with the no-drink group, then compare the caffeine group with the decaf group.",
    explanation: "The decaf group (305 ms) was faster than the no-drink group (330 ms), so expecting caffeine helped: a placebo effect. The caffeine group (285 ms) was faster still, so caffeine added an effect beyond expectations.",
    feedback: [
      "Correct: decaf beat no drink, showing a placebo effect, and caffeine beat decaf, showing a real effect of caffeine.",
      "The decaf group shows a placebo effect, but the caffeine group was faster still, so caffeine also had a real effect.",
      "Lower times are faster: the caffeine group (285 ms) was faster than the decaf group (305 ms), not slower.",
      "Being slower than caffeine doesn't rule out expectations; decaf was still faster than no drink, which shows a placebo effect."
    ]
  },
  {
    id: "q-single-blind-study-1",
    status: "draft",
    term: "single-blind-study",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "research",
    difficulty: 5,
    stem: "In Dr. Walker's study of a new sleep aid, participants do not know whether they received the real pill or a placebo. Dr. Walker, who interviews participants and rates their sleep quality, knows which pill each person received. Which of the following best describes this study?",
    choices: [
      "Single-blind, with a risk of experimenter bias",
      "Double-blind, with a risk of experimenter bias",
      "Single-blind, with no way to detect a placebo effect",
      "Double-blind, with no remaining risk of bias"
    ],
    answer: 0,
    choiceRefs: ["single-blind-study", "double-blind-study", "single-blind-study", "double-blind-study"],
    hint: "Consider who knows each participant's group, and who rates the outcome.",
    explanation: "Only the participants are kept unaware of their condition, so the study is single-blind. Because Dr. Walker rates sleep quality while knowing the groups, experimenter bias could affect the results.",
    feedback: [
      "Correct: only participants are unaware of their group, and Dr. Walker's knowledge could influence how she rates sleep quality.",
      "In a double-blind study, the person rating outcomes wouldn't know the groups, but Dr. Walker does know.",
      "The study is single-blind, but its placebo group still lets Dr. Walker compare expectation effects with the real pill's effects.",
      "Because Dr. Walker knows who got the real pill, the study isn't double-blind, and her expectations could bias her ratings."
    ]
  },
  {
    id: "q-double-blind-study-1",
    status: "draft",
    term: "double-blind-study",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "prediction",
    difficulty: 4,
    stem: "Dr. Amari's antidepressant study is single-blind: participants don't know whether they got the drug or a placebo, but the assistants who rate participants' mood do know. If she changes the study so the assistants also don't know, which outcome is most likely?",
    choices: [
      "The placebo group will stop reporting any improvement in mood.",
      "Participants will be more likely to guess which pill they received.",
      "The study will no longer need a placebo for the control group.",
      "Assistants' expectations will be less likely to sway their ratings."
    ],
    answer: 3,
    choiceRefs: ["placebo-effect", null, "placebo", "experimenter-bias"],
    hint: "Think about whose expectations the change removes from the results.",
    explanation: "Making the study double-blind keeps the assistants unaware of who got the drug, which controls for experimenter bias in their mood ratings.",
    feedback: [
      "Participants already didn't know their group, so a placebo effect can still occur; blinding the assistants doesn't remove it.",
      "Blinding the assistants makes it harder, not easier, for anyone to reveal which pill a participant received.",
      "A double-blind study still uses a placebo; that is how both participants and assistants are kept unaware of the groups.",
      "Correct: when the people rating mood don't know the groups, their expectations can't push ratings in one direction."
    ]
  },
  {
    id: "q-research-confederates-1",
    status: "draft",
    term: "research-confederates",
    ced: ["0.3", "0.7"],
    skills: ["2.B", "2.D"],
    style: "scenario",
    difficulty: 1,
    stem: "In a study on helping behavior, a man who appears to be another participant drops a stack of papers in the hallway, and researchers record whether the real participant stops to help. The man actually works for the researchers. He is best described as",
    choices: ["a member of the control group", "a research confederate", "the dependent variable", "a placebo"],
    answer: 1,
    choiceRefs: ["control-group", "research-confederates", "dependent-variables", "placebo"],
    hint: "Notice that the man is pretending to be something he isn't.",
    explanation: "The man poses as a participant but secretly works for the researchers. That makes him a research confederate, and his role involves deception.",
    feedback: [
      "The control group is made up of real participants who don't receive the treatment, but this man works for the researchers.",
      "Correct: a confederate pretends to be a participant while secretly working for the researcher, often as part of a deception.",
      "The dependent variable is whether the real participant helps, which is what researchers measure.",
      "A placebo is an inactive treatment, like a sugar pill, given to a control group; it isn't a person in the study."
    ]
  },

  // research-bias
  {
    id: "q-confirmation-bias-1",
    status: "draft",
    term: "confirmation-bias",
    ced: ["0.4", "4.2.B.1"],
    skills: ["1.B"],
    style: "scenario",
    difficulty: 2,
    stem: "Coach Ramírez believes left-handed pitchers get more nervous under pressure. Over the season, he remembers every time a left-hander walked a batter in a close game but forgets the same mistakes made by right-handers. Coach Ramírez is showing",
    choices: ["confirmation bias", "hindsight bias", "overconfidence", "experimenter bias"],
    answer: 0,
    choiceRefs: ["confirmation-bias", "hindsight-bias", "overconfidence", "experimenter-bias"],
    hint: "Notice which mistakes the coach remembers and which ones he forgets.",
    explanation: "Coach Ramírez remembers mistakes that support his belief about left-handers and forgets ones that don't. Favoring evidence that fits an existing belief is confirmation bias.",
    feedback: [
      "Correct: he notices and remembers information that fits his belief and overlooks information that doesn't.",
      "Hindsight bias is believing after an outcome that you knew it all along; the coach is selectively remembering evidence.",
      "Overconfidence is being more sure than accurate about judgments; the key here is which evidence the coach remembers.",
      "Experimenter bias occurs when a researcher's expectations affect how a study is run or scored, and the coach isn't running a study."
    ]
  },
  {
    id: "q-hindsight-bias-1",
    status: "draft",
    term: "hindsight-bias",
    ced: ["0.4"],
    skills: ["1.B"],
    style: "best-example",
    difficulty: 2,
    stem: "Which of the following best illustrates hindsight bias?",
    choices: [
      "Before the final, Dev is 95% sure his team will win, but they lose badly.",
      "Ella reads only news stories that agree with her view of a city election.",
      "After an upset, Noor insists she always knew the underdog would win.",
      "Mr. Fox grades essays higher when he expects the writers to be strong students."
    ],
    answer: 2,
    choiceRefs: ["overconfidence", "confirmation-bias", "hindsight-bias", "experimenter-bias"],
    hint: "Look for a judgment made after the outcome was already known.",
    explanation: "Hindsight bias is believing, once an outcome is known, that one would have predicted it. Noor claims she always knew, but only after the surprising result.",
    feedback: [
      "Dev's strong certainty before the game, followed by a loss, illustrates overconfidence.",
      "Seeking out only information that supports her view illustrates confirmation bias.",
      "Correct: claiming after the outcome that she knew it all along is hindsight bias.",
      "Letting his expectations influence how he scores work resembles experimenter bias, not a judgment made after an outcome."
    ]
  },
  {
    id: "q-overconfidence-1",
    status: "draft",
    term: "overconfidence",
    ced: ["0.4"],
    skills: ["1.B", "3.A"],
    style: "research",
    difficulty: 4,
    stem: "Dr. Kowalski had 200 students answer trivia questions and rate how sure they were of each answer before seeing the correct answers. The results:\nAnswers rated \"100% sure\": 74% correct\nAnswers rated \"80% sure\": 61% correct\nAnswers rated \"60% sure\": 52% correct\nThese results best demonstrate",
    choices: ["hindsight bias", "overconfidence", "confirmation bias", "social desirability bias"],
    answer: 1,
    choiceRefs: ["hindsight-bias", "overconfidence", "confirmation-bias", "social-desirability-bias"],
    hint: "Compare each confidence rating with the percentage actually correct.",
    explanation: "Students' confidence exceeded their accuracy at every level; for example, they were right only 74% of the time when \"100% sure.\" Being more confident than correct is overconfidence.",
    feedback: [
      "Hindsight bias happens after an outcome is known, but students rated their confidence before learning whether they were right.",
      "Correct: at every level, students' confidence was higher than their actual accuracy.",
      "Confirmation bias involves favoring evidence for an existing belief; these data compare confidence with accuracy.",
      "Social desirability bias involves answering to look good; the data show a gap between confidence and accuracy instead."
    ]
  },
  {
    id: "q-experimenter-bias-1",
    status: "draft",
    term: "experimenter-bias",
    ced: ["0.4"],
    skills: ["2.B"],
    style: "research",
    difficulty: 3,
    stem: "Dr. Holt believes a new writing program improves students' essays. When scoring essays at the end of the study, she knows which students used the program, and she gives those essays slightly higher scores. Which of the following changes would best reduce this problem?",
    choices: [
      "Giving the writing program to more students",
      "Telling the students which group they are in",
      "Having students score their own essays",
      "Having scorers who don't know the groups"
    ],
    answer: 3,
    choiceRefs: [null, null, "self-report-bias", "experimenter-bias"],
    hint: "The problem comes from what the scorer knows.",
    explanation: "Dr. Holt's expectations are influencing her scores, which is experimenter bias. Using scorers who don't know which students used the program removes that influence.",
    feedback: [
      "A larger sample doesn't fix the problem, because Dr. Holt's expectations would still influence her scoring.",
      "Telling students their group would add participant expectations without removing Dr. Holt's bias.",
      "Students know whether they used the program and want good scores, so self-scoring would add a new bias.",
      "Correct: scorers who are blind to the groups can't let expectations about the program influence their scores."
    ]
  },
  {
    id: "q-social-desirability-bias-1",
    status: "draft",
    term: "social-desirability-bias",
    ced: ["0.4"],
    skills: ["2.C"],
    style: "explain",
    difficulty: 3,
    stem: "A school asks students the same question on two surveys: \"How often have you copied someone else's homework?\" On the version that requires names, 8% report copying; on an anonymous version given to a similar group of students, 41% do. Which of the following best explains the difference?",
    choices: [
      "Students worry less about being judged when answers are anonymous.",
      "The anonymous survey used more favorable wording about copying.",
      "Students remember their own behavior more accurately without names.",
      "The anonymous survey was given to a much larger sample of students."
    ],
    answer: 0,
    choiceRefs: ["social-desirability-bias", "wording-effect", "self-report-bias", "sample"],
    hint: "Think about what changes when students' names are attached to their answers.",
    explanation: "Requiring names makes students worry about how their answers will look, so many underreport copying. Answering to look good rather than truthfully is social desirability bias.",
    feedback: [
      "Correct: when names are attached, students tend to underreport copying to look good, which is social desirability bias.",
      "Both versions asked the identical question, so wording can't explain the difference; only the name requirement changed.",
      "Writing a name doesn't change how well students remember their behavior; it changes how much they worry about being judged.",
      "Sample size alone wouldn't shift the percentage this much; the groups were similar, and only the name requirement differed."
    ]
  },
  {
    id: "q-self-report-bias-1",
    status: "draft",
    term: "self-report-bias",
    ced: ["0.4"],
    skills: ["2.C"],
    style: "compare",
    difficulty: 5,
    stem: "Which of the following statements about self-report bias is most accurate?",
    choices: [
      "It occurs only when participants are trying to make themselves look good.",
      "It can be eliminated by having participants answer every item on a Likert scale.",
      "It can occur on anonymous surveys because people misjudge their own behavior.",
      "It affects naturalistic observation more than it affects surveys."
    ],
    answer: 2,
    choiceRefs: ["social-desirability-bias", "likert-scale", "self-report-bias", "naturalistic-observation"],
    hint: "Consider whether wanting to look good is the only reason self-descriptions can be wrong.",
    explanation: "Self-report bias includes any inaccuracy from people describing themselves, including faulty memory. Anonymity reduces the urge to look good, but it doesn't fix memory errors.",
    feedback: [
      "Wanting to look good is one cause, but poor memory and misunderstood questions also produce self-report bias.",
      "A Likert scale still relies on people describing themselves, so self-report bias can still occur.",
      "Correct: even with no reason to impress anyone, people may misremember or misjudge their own behavior.",
      "Naturalistic observation records behavior directly instead of relying on self-descriptions, so it avoids self-report bias."
    ]
  },
  {
    id: "q-wording-effect-1",
    status: "draft",
    term: "wording-effect",
    ced: ["0.4"],
    skills: ["2.C"],
    style: "research",
    difficulty: 4,
    stem: "A school randomly split its students into two halves for a survey. Half were asked, \"Should the school forbid phones during lunch?\" and 34% said yes. The other half were asked, \"Should the school not allow phones during lunch?\" and 57% said yes. Which of the following best explains the difference in results?",
    choices: ["Sampling bias", "Wording effect", "Confirmation bias", "Social desirability bias"],
    answer: 1,
    choiceRefs: ["sampling-bias", "wording-effect", "confirmation-bias", "social-desirability-bias"],
    hint: "The two groups were similar, so what else differed between the two versions?",
    explanation: "Both questions ask about the same policy, but \"forbid\" sounds stronger than \"not allow,\" so fewer students agreed with it. A change in answers caused by phrasing is the wording effect.",
    feedback: [
      "Sampling bias occurs when a sample doesn't represent the population; the halves were formed randomly, so they should be similar.",
      "Correct: both questions describe the same policy, but \"forbid\" sounds harsher than \"not allow,\" which changed responses.",
      "Confirmation bias is favoring evidence that supports one's beliefs; it doesn't explain why two similar groups answered differently.",
      "Social desirability bias would push both groups in the same direction; only the phrasing of the question differed."
    ]
  },
  // statistics
  {
    id: "q-central-tendency-1",
    status: "draft",
    term: "central-tendency",
    ced: ["0.5"],
    skills: ["3.B"],
    style: "compare",
    difficulty: 2,
    stem: "Which of the following statements about the mean, median, and mode of a data set is most accurate?",
    choices: [
      "They describe how spread out the scores are.",
      "They can be three different values for the same data.",
      "They are always equal when there are no outliers.",
      "They can be found only for normally distributed data."
    ],
    answer: 1,
    choiceRefs: ["variation", "central-tendency", null, "normal-curve"],
    hint: "Try a small set of scores, such as 2, 2, 3, 9, and find each measure.",
    explanation: "Each measure defines the center of the data in a different way, so they often disagree. For 2, 2, 3, 9, the mode is 2, the median is 2.5, and the mean is 4.",
    feedback: [
      "Spread is described by measures of variation, such as the range and standard deviation; the mean, median, and mode describe the center.",
      "Correct: each measure locates the center differently, so one data set can have a different mean, median, and mode.",
      "Even without outliers they can differ; for 1, 1, 4, 6, the mode is 1, the median is 2.5, and the mean is 3.",
      "Any set of numeric scores has a mean and a median, whatever the shape of its distribution."
    ]
  },
  {
    id: "q-mean-1",
    status: "draft",
    term: "mean",
    ced: ["0.5"],
    skills: ["3.B"],
    style: "research",
    difficulty: 2,
    stem: "Dr. Osei records how many hours of sleep six students got the night before an exam:\n5, 6, 6, 7, 8, 10\nWhat is the mean number of hours?",
    choices: ["5", "6", "6.5", "7"],
    answer: 3,
    choiceRefs: ["range", "mode", "median", "mean"],
    shuffle: false,
    hint: "The mean uses every score in the set, not just the middle one or the most common one.",
    explanation: "The six scores add up to 42, and 42 divided by 6 is 7, so the mean is 7 hours.",
    feedback: [
      "5 is the range (10 - 5), which measures how spread out the scores are, not their average.",
      "6 is the mode, the score that appears most often, not the arithmetic average.",
      "6.5 is the median, the midpoint between the two middle scores, 6 and 7.",
      "Correct: the scores total 42, and 42 divided by 6 students is 7 hours."
    ]
  },
  {
    id: "q-median-1",
    status: "draft",
    term: "median",
    ced: ["0.5"],
    skills: ["3.B"],
    style: "prediction",
    difficulty: 2,
    stem: "A town of 300 households includes three households that each earn over $5 million a year. Most households earn between $45,000 and $70,000. A reporter wants one number that best represents a typical household's income. The reporter should use the",
    choices: [
      "median, because the few extreme incomes barely affect it",
      "mean, because it includes every household's income",
      "range, because it shows the full spread of incomes",
      "standard deviation, because it shows how far incomes are from the mean"
    ],
    answer: 0,
    choiceRefs: ["median", "mean", "range", "standard-deviation"],
    hint: "Ask which measure would change a lot if one of the millionaires moved away.",
    explanation: "The three very high incomes pull the mean far above what most households earn. The median is the middle income, so it stays close to what a typical household earns.",
    feedback: [
      "Correct: the median is the middle value, so a few extreme incomes don't pull it away from typical households.",
      "Including every income is the problem here: three multimillion-dollar incomes pull the mean far above what most households earn.",
      "The range describes spread, not a typical value, and it would be huge here because of the extreme incomes.",
      "Standard deviation describes how spread out incomes are, not what a typical household earns."
    ]
  },
  {
    id: "q-mode-1",
    status: "draft",
    term: "mode",
    ced: ["0.5"],
    skills: ["3.B"],
    style: "scenario",
    difficulty: 2,
    stem: "A cafeteria manager tallies the sandwiches students buy in one week: turkey (42), veggie (35), ham (18), and tuna (12). To decide which sandwich to stock the most of, which statistic should she use?",
    choices: ["Mean", "Median", "Mode", "Range"],
    answer: 2,
    choiceRefs: ["mean", "median", "mode", "range"],
    hint: "Sandwich types are categories, not numbers that can be added up or put in order.",
    explanation: "She needs the most frequently chosen sandwich, which is the mode (turkey). The mean and median require numerical scores, but sandwich types are categories.",
    feedback: [
      "A mean requires adding numerical scores; sandwich types are categories, so they can't be averaged.",
      "A median requires putting scores in numerical order; sandwich types have no natural order.",
      "Correct: the mode is the most frequent category, turkey, which tells her what students buy most.",
      "The range measures the spread between the highest and lowest scores and can't identify the most popular sandwich."
    ]
  },
  {
    id: "q-variation-1",
    status: "draft",
    term: "variation",
    ced: ["0.5"],
    skills: ["3.B"],
    style: "explain",
    difficulty: 2,
    stem: "Kenji and Darius each average 15 points per basketball game. Kenji usually scores between 13 and 17 points, while Darius scores anywhere from 2 to 30. Their coach says the two players perform the same. Which of the following best explains the flaw in the coach's reasoning?",
    choices: [
      "The coach should have compared the players' modes instead of their means.",
      "The coach ignored how much each player's scores vary from game to game.",
      "The coach cannot compute averages without a much larger number of games.",
      "Averages can be compared only when scores form a normal curve."
    ],
    answer: 1,
    choiceRefs: ["mode", "variation", null, "normal-curve"],
    hint: "Two players can share the same center but differ in something else.",
    explanation: "Equal means show the players have the same center, but Darius's scores are far more spread out. Measures of variation, such as the range or standard deviation, show that Kenji is much more consistent.",
    feedback: [
      "The mode is another measure of central tendency; like the mean, it says nothing about how consistent each player is.",
      "Correct: the averages match, but Darius's scores are much more spread out, so the players differ in consistency.",
      "The number of games isn't the issue; even with many games, equal means can hide very different spreads.",
      "Means can be compared for any distribution shape; the real problem is that the coach ignored spread."
    ]
  },
  {
    id: "q-range-1",
    status: "draft",
    term: "range",
    ced: ["0.5"],
    skills: ["3.B"],
    style: "explain",
    difficulty: 4,
    stem: "Dr. Russo records five participants' reaction times in milliseconds:\n210, 240, 250, 260, 650\nShe reports a range of 440 ms and concludes that reaction times varied widely across participants. Which of the following best explains the problem with her conclusion?",
    choices: [
      "The range should be found by subtracting the mean from the highest score.",
      "The range measures central tendency, so it cannot describe how scores vary.",
      "The range uses only the two extreme scores, so one outlier can inflate it.",
      "The range cannot be calculated when a data set includes an outlier."
    ],
    answer: 2,
    choiceRefs: ["mean", "central-tendency", "range", null],
    hint: "Look at how close together four of the five times are.",
    explanation: "Four of the five times fall within 50 ms of each other; only the 650 ms score is far away. Because the range uses only the highest and lowest scores, that one outlier makes the data look much more varied than they are.",
    feedback: [
      "The range is the highest score minus the lowest (650 - 210 = 440), so her math is right; the problem is what the number represents.",
      "The range is a measure of variation, not central tendency; the problem is that it relies on only two scores.",
      "Correct: four times cluster between 210 and 260 ms, and the single 650 ms score alone makes the range large.",
      "The range can always be calculated; it just becomes misleading when an outlier sets one of its endpoints."
    ]
  },
  {
    id: "q-percentile-rank-1",
    status: "draft",
    term: "percentile-rank",
    ced: ["0.5"],
    skills: ["3.B"],
    style: "research",
    difficulty: 3,
    stem: "On a statewide reading test, Amara's score report says she is at the 84th percentile. Which of the following is the most accurate interpretation?",
    choices: [
      "She scored as high as or higher than about 84% of test takers.",
      "She answered about 84% of the reading test's questions correctly.",
      "About 84% of test takers scored higher than she did.",
      "She scored 84 points higher than the average test taker."
    ],
    answer: 0,
    choiceRefs: ["percentile-rank", null, null, "mean"],
    hint: "A percentile compares a score with other people's scores, not with the number of questions.",
    explanation: "Percentile rank is the percentage of scores at or below a given score. At the 84th percentile, Amara did as well as or better than about 84% of the students who took the test.",
    feedback: [
      "Correct: percentile rank gives the share of test takers who scored at or below her, here about 84%.",
      "Percent correct counts questions answered right; percentile rank compares her score with other test takers' scores.",
      "This reverses the meaning: at the 84th percentile, only about 16% of test takers scored higher than Amara.",
      "Percentile rank is a percentage of people, not a number of points above the mean."
    ]
  },
  {
    id: "q-normal-curve-1",
    status: "draft",
    term: "normal-curve",
    ced: ["0.5"],
    skills: ["3.B"],
    style: "research",
    difficulty: 4,
    stem: "Scores on a memory test form a normal curve with a mean of 50 and a standard deviation of 10. Priyanka scores 60. Her percentile rank is closest to the",
    choices: ["34th", "50th", "68th", "84th"],
    answer: 3,
    choiceRefs: [null, null, null, null],
    shuffle: false,
    hint: "A score of 60 is exactly one standard deviation above the mean; think about everyone who scored below it.",
    explanation: "Half of all scores fall below the mean of 50, and about 34% fall between 50 and 60 (one standard deviation above). So about 84% of scores are at or below 60.",
    feedback: [
      "About 34% of scores fall between the mean and one standard deviation above it, but this leaves out the 50% below the mean.",
      "The 50th percentile is the mean itself, a score of 50, and Priyanka scored above the mean.",
      "About 68% of scores fall within one standard deviation on both sides of the mean, not below one standard deviation above it.",
      "Correct: 50% of scores fall below the mean and about 34% fall between 50 and 60, for about 84% in all."
    ]
  },
  {
    id: "q-positively-skewed-distribution-1",
    status: "draft",
    term: "positively-skewed-distribution",
    ced: ["0.5"],
    skills: ["3.B"],
    style: "research",
    difficulty: 4,
    stem: "On Dr. Brandt's very difficult statistics exam, most students scored between 40 and 60, but a few students scored above 95. Which of the following best describes the distribution of scores?",
    choices: [
      "Negatively skewed, with a mean lower than the median",
      "Positively skewed, with a mean lower than the median",
      "Positively skewed, with a mean higher than the median",
      "Normal, with a mean about equal to the median"
    ],
    answer: 2,
    choiceRefs: ["negatively-skewed-distribution", "positively-skewed-distribution", "positively-skewed-distribution", "normal-curve"],
    hint: "Find where the few unusual scores are, then think about which measure they pull toward them.",
    explanation: "The few very high scores stretch the tail to the right, so the distribution is positively skewed. Those high scores pull the mean up, so the mean is higher than the median.",
    feedback: [
      "Negative skew comes from a few unusually low scores; here the unusual scores are high, stretching the tail to the right.",
      "The direction of skew is right, but the few high scores pull the mean up, so it is higher than the median, not lower.",
      "Correct: a few very high scores stretch the right tail and pull the mean above the median.",
      "A normal curve is symmetrical, but these scores bunch between 40 and 60 with a few far above, so the curve is lopsided."
    ]
  },
  {
    id: "q-negatively-skewed-distribution-1",
    status: "draft",
    term: "negatively-skewed-distribution",
    ced: ["0.5"],
    skills: ["3.B"],
    style: "best-example",
    difficulty: 3,
    stem: "Which of the following would most likely produce a negatively skewed distribution?",
    choices: [
      "Yearly incomes of all adults working in a large city",
      "Scores on an easy quiz that almost every student aces",
      "Heights of adult women in a large national sample",
      "Arrival times at a café that is busiest at breakfast and dinner"
    ],
    answer: 1,
    choiceRefs: ["positively-skewed-distribution", "negatively-skewed-distribution", "normal-curve", "bimodal-distribution"],
    hint: "Think about where most scores would pile up and which direction the few unusual scores would stretch.",
    explanation: "On an easy quiz, most scores pile up near the top, and the few students who struggled create a tail stretching to the left. A tail toward the low scores is a negative skew.",
    feedback: [
      "Most people earn moderate incomes and a few earn very high ones, which stretches the tail right and creates a positive skew.",
      "Correct: most scores bunch near the top, and a few low scores stretch the tail to the left.",
      "Heights of a large group of adults usually form a roughly normal, symmetrical curve.",
      "Two busy times would create two peaks, a bimodal distribution, rather than a skew."
    ]
  },
  {
    id: "q-bimodal-distribution-1",
    status: "draft",
    term: "bimodal-distribution",
    ced: ["0.5"],
    skills: ["3.B"],
    style: "research",
    difficulty: 1,
    stem: "Dr. Castillo graphs the ages of everyone at a public pool on a summer afternoon. Many swimmers are around age 8, many are around age 35, and very few are between 15 and 25. Which of the following best describes the graph?",
    choices: ["Normal curve", "Positively skewed distribution", "Negatively skewed distribution", "Bimodal distribution"],
    answer: 3,
    choiceRefs: ["normal-curve", "positively-skewed-distribution", "negatively-skewed-distribution", "bimodal-distribution"],
    hint: "Count how many places the graph rises to a high point.",
    explanation: "The ages cluster in two separate places, around 8 (children) and around 35 (their parents), with few people in between. A distribution with two distinct peaks is bimodal.",
    feedback: [
      "A normal curve has one peak in the middle with fewer scores toward both ends; these ages cluster in two places.",
      "A positive skew has one peak with a long tail of high scores, not two separate clusters.",
      "A negative skew has one peak with a long tail of low scores, not two separate clusters.",
      "Correct: ages cluster around 8 and around 35 with few in between, giving two distinct peaks."
    ]
  },
  {
    id: "q-standard-deviation-1",
    status: "draft",
    term: "standard-deviation",
    ced: ["0.5"],
    skills: ["3.B"],
    style: "research",
    difficulty: 5,
    stem: "Two sections took the same chemistry test.\nSection 1: mean 78, standard deviation 4\nSection 2: mean 78, standard deviation 14\nLina scored 86 in Section 1, and Noor scored 86 in Section 2. Which of the following is most accurate?",
    choices: [
      "Lina's score stands out more within her section than Noor's score does.",
      "Noor's score stands out more because Section 2 has the larger standard deviation.",
      "The two scores stand out equally because both sections have the same mean.",
      "Section 2 performed better overall because its standard deviation is larger."
    ],
    answer: 0,
    choiceRefs: ["standard-deviation", null, null, null],
    hint: "Measure each 8-point gap above the mean in units of that section's standard deviation.",
    explanation: "Both students scored 8 points above the mean. In Section 1 that is 2 standard deviations (8 divided by 4), but in Section 2 it is less than 1 (8 divided by 14), so Lina's score is far more unusual within her section.",
    feedback: [
      "Correct: 8 points is 2 standard deviations above the mean in Section 1 but less than 1 in Section 2.",
      "A larger standard deviation means scores are more spread out, so an 8-point gap is less unusual there, not more.",
      "Equal means and equal raw scores aren't enough; how unusual a score is depends on the spread of the scores around it.",
      "Standard deviation shows spread, not performance; both sections had the same mean of 78."
    ]
  },
  {
    id: "q-regression-toward-the-mean-1",
    status: "draft",
    term: "regression-toward-the-mean",
    ced: ["0.5"],
    skills: ["3.B"],
    style: "explain",
    difficulty: 4,
    stem: "A baseball player who usually bats .270 hits .410 during his first month of the season. After he appears on a magazine cover, he hits .285 the next month. Fans blame a \"cover curse.\" Which of the following best explains his drop?",
    choices: [
      "Being on the cover caused stress that lowered his performance.",
      "The first month had too few games to calculate a batting average.",
      "Extreme stretches are usually followed by results nearer his average.",
      "His success in the first month made him overconfident about his skills."
    ],
    answer: 2,
    choiceRefs: [null, null, "regression-toward-the-mean", "overconfidence"],
    hint: "Compare both months with what this player usually hits.",
    explanation: "A .410 month is far above his usual .270, so it likely included a lucky streak. Later results tend to fall back toward a person's typical level, which explains the drop without any curse.",
    feedback: [
      "Stress is possible, but nothing in the stem supports it, and a drop would be expected even without the magazine cover.",
      "A batting average can be calculated for any number of at-bats; the issue is that one extreme month rarely lasts.",
      "Correct: a .410 month is extreme for a .270 hitter, so his next month moving back toward .270 is expected.",
      "Nothing in the stem suggests overconfidence; extreme performances usually fall back toward average on their own."
    ]
  },
  {
    id: "q-effect-sizes-1",
    status: "draft",
    term: "effect-sizes",
    ced: ["0.5"],
    skills: ["3.C"],
    style: "research",
    difficulty: 3,
    stem: "Dr. Mensah compares three studies of exercise and mood. The effect sizes were:\nStudy X: 0.15\nStudy Y: 0.50\nStudy Z: 0.85\nWhich of the following best describes the results?",
    choices: [
      "Study X found the strongest effect, because smaller numbers mean less error.",
      "Study Z found a large effect, and Study X found a small one.",
      "All three studies found large effects, because each is above zero.",
      "Study Y found a medium effect, so its result is probably due to chance."
    ],
    answer: 1,
    choiceRefs: [null, "effect-sizes", null, "statistical-significance"],
    hint: "Compare each value with the usual cutoffs for small, medium, and large effects.",
    explanation: "Effect sizes of about 0.2 or below are small, 0.3 to 0.7 are medium, and 0.8 or above are large. Study Z (0.85) found a large effect, and Study X (0.15) found a small one.",
    feedback: [
      "A larger effect size means a stronger effect; 0.15 is the weakest of the three, not the strongest.",
      "Correct: 0.85 is above the 0.8 cutoff for a large effect, and 0.15 is below the 0.2 cutoff for a small one.",
      "An effect size above zero shows some effect, but only values of about 0.8 or more count as large.",
      "Effect size shows strength, not whether results are due to chance; statistical significance addresses chance."
    ]
  },
  {
    id: "q-statistical-significance-1",
    status: "draft",
    term: "statistical-significance",
    ced: ["0.5"],
    skills: ["3.C"],
    style: "research",
    difficulty: 5,
    stem: "Dr. Alves finds that students who used a new flashcard app scored higher than a control group. The difference was statistically significant, and the effect size was 0.15. Which of the following conclusions is best supported?",
    choices: [
      "The app had a large effect, because the result was statistically significant.",
      "The difference is probably due to chance, because the effect size is so small.",
      "The app had no real effect, because effect sizes below 0.2 are not meaningful.",
      "The difference is probably not due to chance, but the app's effect was small."
    ],
    answer: 3,
    choiceRefs: ["effect-sizes", "statistical-significance", "effect-sizes", "statistical-significance"],
    hint: "Statistical significance and effect size answer two different questions about a result.",
    explanation: "Statistical significance means the difference is unlikely to be due to chance. The effect size of 0.15 shows the difference was small. Both can be true at once.",
    feedback: [
      "Significance shows a result is unlikely to be due to chance, not that it is large; an effect size of 0.15 is small.",
      "Statistical significance, not effect size, addresses chance, and this result was significant; a small effect can still be real.",
      "A small effect is still an effect; the significant result suggests it is real, even though it is modest.",
      "Correct: significance means the difference is unlikely to be due to chance, and 0.15 means the effect was small."
    ]
  },
  {
    id: "q-scatterplot-1",
    status: "draft",
    term: "scatterplot",
    ced: ["0.5"],
    skills: ["3.C"],
    style: "research",
    difficulty: 3,
    stem: "Dr. Patel makes a scatterplot of students' weekly hours of phone use (horizontal axis) and their GPAs (vertical axis). The points form a wide, loose cloud that slopes downward from left to right. Which of the following best describes the relationship?",
    choices: ["A strong positive correlation", "A strong negative correlation", "A moderate negative correlation", "No correlation"],
    answer: 2,
    choiceRefs: ["positive-correlation", "negative-correlation", "negative-correlation", null],
    hint: "The slope shows the direction, and how tightly the points cluster shows the strength.",
    explanation: "A downward slope means GPA tends to fall as phone use rises, which is a negative correlation. Because the points form a wide, loose cloud rather than a tight line, the relationship is only moderate.",
    feedback: [
      "A positive correlation slopes upward from left to right; these points slope downward.",
      "The direction is right, but in a strong correlation the points cluster tightly around a line, not in a wide, loose cloud.",
      "Correct: the downward slope shows a negative correlation, and the loose spread shows it is moderate rather than strong.",
      "With no correlation the points would show no overall slope; these points clearly trend downward."
    ]
  },
  {
    id: "q-scatterplot-2",
    status: "draft",
    term: "scatterplot",
    ced: ["0.5"],
    skills: ["3.C"],
    style: "research",
    difficulty: 3,
    stem: "Dr. Kaur recorded each student's weekly hours of phone use and GPA. Based on the scatterplot, which of the following best describes the relationship between the two variables?",
    figure: {
      type: "scatter",
      title: "Weekly phone use and GPA (32 students)",
      alt: "Scatterplot of 32 students. The points drift downward from upper left to lower right but are widely scattered around that trend.",
      x: { label: "Phone use (hours per week)", min: 0, max: 40, step: 10 },
      y: { label: "GPA", min: 1, max: 4, step: 0.5, decimals: 1 },
      points: [[4, 3.49], [31, 3.08], [17, 3.41], [33, 2.89], [37, 2.45], [15, 3.65], [6, 3.34], [6, 3.41], [19, 2.76], [12, 3.85], [22, 3.28], [17, 3.28], [7, 3.08], [9, 3.86], [36, 2.09], [4, 3.48], [36, 1.99], [37, 2.87], [24, 2.28], [32, 2.63], [9, 4], [38, 2.72], [12, 3.58], [16, 3.5], [27, 2.95], [24, 2.88], [28, 3.04], [5, 3.03], [28, 3.32], [29, 3.31], [5, 2.26], [38, 1.8]]
    },
    choices: [
      "A strong positive correlation",
      "A strong negative correlation",
      "A moderate negative correlation",
      "No correlation"
    ],
    answer: 2,
    choiceRefs: ["positive-correlation", "negative-correlation", "negative-correlation", null],
    hint: "The overall slope shows the direction, and how tightly the points cluster around a line shows the strength.",
    explanation: "GPA tends to be lower for students with more phone use, so the correlation is negative. The points are widely scattered around that trend rather than close to a line, so the relationship is moderate, not strong.",
    feedback: [
      "A positive correlation slopes upward from left to right; these points drift downward.",
      "The direction is right, but in a strong correlation the points lie close to a line; these are widely scattered.",
      "Correct: the points trend downward, and the wide scatter shows the relationship is moderate rather than strong.",
      "With no correlation the points would show no overall slope; these clearly drift downward."
    ]
  },
  {
    id: "q-correlation-coefficient-1",
    status: "draft",
    term: "correlation-coefficient",
    ced: ["0.5"],
    skills: ["3.C"],
    style: "compare",
    difficulty: 3,
    stem: "Which of the following correlation coefficients shows the strongest relationship between two variables?",
    choices: ["-0.82", "-0.15", "+0.10", "+0.64"],
    answer: 0,
    choiceRefs: [null, null, null, null],
    shuffle: false,
    hint: "The sign shows direction; strength depends on how far the number is from zero.",
    explanation: "Strength is shown by how close the coefficient is to -1 or +1, whatever its sign. At -0.82, this coefficient is farther from zero than any of the others.",
    feedback: [
      "Correct: -0.82 is farthest from zero, so it shows the strongest relationship; the minus sign only shows its direction.",
      "-0.15 is close to zero, so it shows a weak relationship.",
      "+0.10 is very close to zero, so it shows almost no relationship.",
      "+0.64 is a moderate positive relationship, but it is closer to zero than -0.82."
    ]
  },
  {
    id: "q-positive-correlation-1",
    status: "draft",
    term: "positive-correlation",
    ced: ["0.5"],
    skills: ["3.C"],
    style: "best-example",
    difficulty: 3,
    stem: "Which of the following best illustrates a positive correlation?",
    choices: [
      "The more Ines practices piano, the fewer mistakes she makes at recitals.",
      "Neighborhoods with more trees tend to have cooler summer temperatures.",
      "Students' shoe sizes show no relationship to their vocabulary scores.",
      "Students who sleep less each night tend to remember less from class."
    ],
    answer: 3,
    choiceRefs: ["negative-correlation", "negative-correlation", null, "positive-correlation"],
    hint: "In a positive correlation, the two variables move in the same direction, whether that direction is up or down.",
    explanation: "Less sleep goes with less memory, so the two variables move in the same direction. Variables that decrease together form a positive correlation, just as variables that increase together do.",
    feedback: [
      "More practice goes with fewer mistakes, so the variables move in opposite directions, a negative correlation.",
      "More trees go with lower temperatures, so the variables move in opposite directions, a negative correlation.",
      "No relationship between two variables means a correlation near zero, not a positive one.",
      "Correct: sleep and memory decrease together, and variables that move in the same direction form a positive correlation."
    ]
  },
  {
    id: "q-negative-correlation-1",
    status: "draft",
    term: "negative-correlation",
    ced: ["0.5"],
    skills: ["3.C"],
    style: "scenario",
    difficulty: 1,
    stem: "Ms. Okonkwo notices that students with more absences tend to have lower final exam scores. This pattern is an example of",
    choices: ["a positive correlation", "a negative correlation", "a bimodal distribution", "regression toward the mean"],
    answer: 1,
    choiceRefs: ["positive-correlation", "negative-correlation", "bimodal-distribution", "regression-toward-the-mean"],
    hint: "Notice whether the two variables move in the same direction or in opposite directions.",
    explanation: "As absences go up, exam scores tend to go down. When one variable rises as the other falls, the correlation is negative.",
    feedback: [
      "In a positive correlation both variables rise or fall together; here absences rise as scores fall.",
      "Correct: as absences rise, scores tend to fall, so the variables move in opposite directions.",
      "A bimodal distribution describes one variable with two peaks, not a relationship between two variables.",
      "Regression toward the mean is extreme scores being followed by more typical ones, not a relationship between two variables."
    ]
  },
  {
    id: "q-correlation-does-not-equal-causation-1",
    status: "draft",
    term: "correlation-does-not-equal-causation",
    ced: ["0.5"],
    skills: ["2.C"],
    style: "explain",
    difficulty: 2,
    stem: "A headline reads \"Eating Breakfast Makes Kids Smarter,\" based on a survey finding that children who eat breakfast earn higher grades. Which of the following best explains the problem with the headline?",
    choices: [
      "The survey shows a relationship, but it can't show that breakfast raises grades.",
      "Grades are a poor measure of intelligence, so the survey found no real relationship.",
      "The relationship actually shows that earning higher grades causes children to eat breakfast.",
      "Surveys cannot be used to find relationships between eating habits and grades."
    ],
    answer: 0,
    choiceRefs: ["correlation-does-not-equal-causation", null, "directionality-problem", "survey"],
    hint: "Ask whether the researchers changed anything or only measured what children already did.",
    explanation: "The survey only measured two existing variables, so it shows a correlation. Without an experiment, it can't show that breakfast causes the higher grades.",
    feedback: [
      "Correct: a survey can show that breakfast and grades are related, but a correlation alone cannot show cause.",
      "Grades may be an imperfect measure, but the survey still found a relationship; the problem is claiming that one variable causes the other.",
      "This also claims cause and effect, just in the other direction; a correlation can't establish either direction of cause.",
      "Surveys can reveal relationships between variables; they just can't show which variable, if any, causes the other."
    ]
  },
  {
    id: "q-directionality-problem-1",
    status: "draft",
    term: "directionality-problem",
    ced: ["0.5"],
    skills: ["2.C"],
    style: "research",
    difficulty: 3,
    stem: "Researchers find that teens who report more anxiety also spend more time on social media. Dr. Ahmed argues that social media use increases anxiety, while Dr. Brooks argues that anxious teens turn to social media to cope. Their disagreement best illustrates",
    choices: ["the third variable problem", "regression toward the mean", "the directionality problem", "sampling bias"],
    answer: 2,
    choiceRefs: ["third-variable-problem", "regression-toward-the-mean", "directionality-problem", "sampling-bias"],
    hint: "Both researchers agree the two variables are related; notice what they disagree about.",
    explanation: "Both researchers accept the correlation but disagree about which variable influences the other. Not knowing the direction of influence in a correlation is the directionality problem.",
    feedback: [
      "The third variable problem involves an outside factor causing both variables; here the debate is which of the two variables affects the other.",
      "Regression toward the mean involves extreme scores moving toward average, not a debate about cause.",
      "Correct: the researchers disagree about whether anxiety leads to social media use or social media use leads to anxiety.",
      "Sampling bias is a flaw in how participants are chosen; nothing here suggests the sample was unrepresentative."
    ]
  },
  {
    id: "q-third-variable-problem-1",
    status: "draft",
    term: "third-variable-problem",
    ced: ["0.5"],
    skills: ["2.C"],
    style: "research",
    difficulty: 4,
    stem: "A study finds that students with more books at home score higher on reading tests, so a school board plans to mail free books to every family. A psychologist notes that parents who love reading tend to buy more books and also read with their children. Which of the following best identifies the psychologist's concern and what it implies?",
    choices: [
      "Directionality problem; good readers may be asking their parents for more books.",
      "Third variable problem; the study proves parents' reading habits raise scores.",
      "Sampling bias; families who own many books were overrepresented in the study.",
      "Third variable problem; mailing books alone may not raise reading scores."
    ],
    answer: 3,
    choiceRefs: ["directionality-problem", "third-variable-problem", "sampling-bias", "third-variable-problem"],
    hint: "The psychologist names a factor that could affect both book ownership and reading scores.",
    explanation: "Parents' love of reading may lead both to more books at home and to higher scores, making it a third variable. If so, mailing books won't supply what actually raised scores, so the plan may not work.",
    feedback: [
      "Reverse causation is possible, but the psychologist describes a separate factor, parents' reading habits, that could drive both variables.",
      "This names the right problem but overclaims: a correlational study can't prove that parents' habits cause higher scores either.",
      "Nothing suggests the sample was unrepresentative; the concern is an outside factor linked to both variables.",
      "Correct: parents' reading habits may drive both books and scores, so adding books alone may not raise scores."
    ]
  },
  {
    id: "q-generalization-1",
    status: "draft",
    term: "generalization",
    ced: ["0.5"],
    skills: ["2.B"],
    style: "research",
    difficulty: 2,
    stem: "Dr. Nakamura tests a new study technique with 40 volunteers from one elite private university and finds that it improves their exam scores. Which of the following conclusions is most appropriate?",
    choices: [
      "The technique will improve exam scores for all high school and college students.",
      "The technique may help similar students but may not help all students.",
      "The technique does not work for students at other kinds of schools.",
      "The results are meaningless because the study used volunteers."
    ],
    answer: 1,
    choiceRefs: ["generalization", "generalization", null, "sampling-bias"],
    hint: "Consider who was in the sample and how much they resemble students everywhere.",
    explanation: "The sample came from one elite university, so it may not represent students in general. The results apply with confidence only to students like those studied until other groups are tested.",
    feedback: [
      "The sample came from one elite university, so it can't support a claim about all students everywhere.",
      "Correct: results from one elite university may apply to similar students, but generalizing further requires a broader sample.",
      "The study didn't test other schools, so it gives no evidence that the technique fails there either.",
      "Volunteer samples limit generalization, but the results still tell us something about students like these."
    ]
  },
  // sampling
  {
    id: "q-sample-1",
    status: "draft",
    term: "sample",
    ced: ["0.6"],
    skills: ["2.B"],
    style: "research",
    difficulty: 1,
    stem: "Dr. Ferreira wants to learn how much homework Ohio high school students do each night. She surveys 500 students from 25 Ohio high schools. In this study, the 500 students are the",
    choices: ["sample", "population", "control group", "independent variable"],
    answer: 0,
    choiceRefs: ["sample", "population", "control-group", "independent-variables"],
    hint: "Ask whether the 500 students are everyone Dr. Ferreira wants to learn about or only the ones she studied.",
    explanation: "Dr. Ferreira wants to learn about all Ohio high school students, the population. The 500 students she actually surveys are the sample drawn from that population.",
    feedback: [
      "Correct: the 500 students actually surveyed are the sample drawn from the larger population.",
      "The population is everyone she wants to learn about, all Ohio high school students, not just the 500 she surveyed.",
      "A control group is a comparison group in an experiment; this survey doesn't compare treatments.",
      "An independent variable is a factor the researcher changes; the students are participants, not a variable."
    ]
  },
  {
    id: "q-population-1",
    status: "draft",
    term: "population",
    ced: ["0.6"],
    skills: ["2.B"],
    style: "research",
    difficulty: 2,
    stem: "Dr. Owusu randomly selects 200 of the 4,000 nurses employed by a hospital system to complete a survey about burnout. Which group is the population in this study?",
    choices: [
      "The 200 nurses who completed the survey",
      "All nurses working in the country",
      "All 4,000 nurses employed by the hospital system",
      "The nurses who report high levels of burnout"
    ],
    answer: 2,
    choiceRefs: ["sample", null, "population", null],
    hint: "Look at the group Dr. Owusu chose from, not just the nurses she chose.",
    explanation: "Dr. Owusu drew her sample from the 4,000 nurses in the hospital system, so they are the population. Nurses outside that system had no chance of being selected.",
    feedback: [
      "The 200 surveyed nurses are the sample, the smaller group drawn from the population.",
      "Nurses outside this hospital system had no chance of being chosen, so they aren't the population the sample represents.",
      "Correct: the sample was drawn from all 4,000 nurses in the hospital system, so they form the population.",
      "Burnout is what's being measured, not how the population is defined; the population includes nurses at every burnout level."
    ]
  },
  {
    id: "q-representative-sample-1",
    status: "draft",
    term: "representative-sample",
    ced: ["0.6"],
    skills: ["2.B"],
    style: "best-example",
    difficulty: 3,
    stem: "Dr. Lindqvist wants to study the exercise habits of adults in a city where 30% of adults are over age 60. Which of the following samples would be most representative?",
    choices: [
      "500 adults surveyed at the city's largest fitness center",
      "2,000 adults who answer an online poll on a popular fitness website",
      "500 adults over age 60 picked at random from city records",
      "500 adults picked at random from a list of all adult residents"
    ],
    answer: 3,
    choiceRefs: ["convenience-sampling", "sampling-bias", null, "representative-sample"],
    hint: "A larger sample is not automatically a better match for the population.",
    explanation: "Choosing at random from a list of all adult residents gives every adult an equal chance of selection, so the sample should resemble the city, including about 30% over age 60. The other samples overrepresent certain groups.",
    feedback: [
      "Gym members probably exercise more than most adults, so this sample would overstate the city's exercise habits.",
      "A large online poll still draws only people who visit fitness sites and choose to answer, so it is not representative.",
      "Random selection helps, but limiting the sample to adults over 60 leaves out the 70% of adults who are younger.",
      "Correct: random selection from all adult residents gives every adult an equal chance, so the sample should resemble the city."
    ]
  },
  {
    id: "q-random-sampling-1",
    status: "draft",
    term: "random-sampling",
    ced: ["0.6", "0.3"],
    skills: ["2.B"],
    style: "compare",
    difficulty: 4,
    stem: "Which of the following best describes the difference between random sampling and random assignment?",
    choices: [
      "Random sampling reduces confounding variables, while random assignment helps results generalize.",
      "Random sampling decides who is in a study, while random assignment decides each person's group.",
      "Random sampling is used only in experiments, while random assignment is used only in surveys.",
      "Random sampling requires a large population, while random assignment requires a small one."
    ],
    answer: 1,
    choiceRefs: ["random-assignment", "random-sampling", null, null],
    hint: "Think about which procedure happens first, before a study has any participants.",
    explanation: "Random sampling chooses participants from the population, which helps results generalize. Random assignment places those participants into experimental or control groups, which helps control confounding variables.",
    feedback: [
      "This reverses the two: random sampling helps results generalize, and random assignment helps control confounding variables.",
      "Correct: random sampling selects participants from the population; random assignment divides them into experimental and control groups.",
      "Random assignment is used in experiments, while random sampling can be used in experiments, surveys, and other designs.",
      "Neither depends on population size; they differ in purpose, choosing participants versus placing them in groups."
    ]
  },
  {
    id: "q-convenience-sampling-1",
    status: "draft",
    term: "convenience-sampling",
    ced: ["0.6"],
    skills: ["2.B"],
    style: "scenario",
    difficulty: 1,
    stem: "For a class project on teen sleep habits, Mia surveys the 28 students in her own first-period class because they are the easiest people for her to reach. Mia's method of choosing participants is",
    choices: ["convenience sampling", "random sampling", "random assignment", "a case study"],
    answer: 0,
    choiceRefs: ["convenience-sampling", "random-sampling", "random-assignment", "case-study"],
    hint: "Ask whether every teen had an equal chance of being picked.",
    explanation: "Mia chose participants because they were easy to reach, not by giving every teen an equal chance. That is convenience sampling, and her class may not represent teens in general.",
    feedback: [
      "Correct: Mia chose the people who were easiest for her to reach, which is convenience sampling.",
      "Random sampling gives every member of the population an equal chance of being chosen; most teens had no chance here.",
      "Random assignment places participants into experimental groups; Mia is choosing who participates, not assigning groups.",
      "A case study examines one person or group in depth; Mia is surveying 28 students about one topic."
    ]
  },
  {
    id: "q-sampling-bias-1",
    status: "draft",
    term: "sampling-bias",
    ced: ["0.6"],
    skills: ["2.B"],
    style: "research",
    difficulty: 4,
    stem: "A radio host asks listeners to call in and say whether they support a new city curfew. Of 600 callers, 82% oppose it, and the host announces that most city residents oppose the curfew. Which of the following is the most serious problem with this conclusion?",
    choices: [
      "A sample of 600 people is too small to represent a whole city.",
      "The callers were not randomly assigned to a control group.",
      "People who chose to call may differ from residents who did not.",
      "The host should have reported the median instead of a percentage."
    ],
    answer: 2,
    choiceRefs: ["sample", "random-assignment", "sampling-bias", "median"],
    hint: "Consider who decided which residents ended up in the sample.",
    explanation: "Listeners chose themselves, and people with strong feelings, or people who listen to that station, are more likely to call. The sample may not represent city residents, which is sampling bias.",
    feedback: [
      "A well-chosen sample of 600 can represent a city; the problem is how these callers were selected, not how many there were.",
      "Random assignment applies to experiments with groups; this is a poll, and its problem is how participants were selected.",
      "Correct: callers chose themselves, and people with strong opinions or who hear this show may not match residents overall.",
      "A percentage is a reasonable way to report poll results; the problem lies in who answered."
    ]
  },
  // ethics
  {
    id: "q-institutional-review-1",
    status: "draft",
    term: "institutional-review",
    ced: ["0.7"],
    skills: ["2.D"],
    style: "research",
    difficulty: 1,
    stem: "Before Dr. Abara can begin a study in which participants receive mild electric shocks, her university requires a committee to examine her procedures and decide whether the risks are acceptable. This requirement is an example of",
    choices: ["debriefing", "informed consent", "confidentiality", "institutional review"],
    answer: 3,
    choiceRefs: ["debriefing", "informed-consent", "confidentiality", "institutional-review"],
    hint: "Notice who is making the decision and when it happens.",
    explanation: "A committee reviews the study's procedures before it begins to protect participants' rights and welfare. That is institutional review.",
    feedback: [
      "Debriefing happens after a study, when participants learn its true purpose; this review happens before the study begins.",
      "Informed consent comes from participants agreeing to take part; here a committee, not the participants, makes the decision.",
      "Confidentiality means keeping participants' information private, not having a committee approve procedures.",
      "Correct: a committee examining the procedures and risks before the study begins is institutional review."
    ]
  },
  {
    id: "q-informed-consent-1",
    status: "draft",
    term: "informed-consent",
    ced: ["0.7"],
    skills: ["2.D"],
    style: "research",
    difficulty: 3,
    stem: "Dr. Varga recruits adult volunteers for a memory study. He tells them only that they will \"take a few memory tests,\" without mentioning that they will also drink a strong caffeinated beverage that can cause jitteriness. Which ethical requirement has Dr. Varga most clearly failed to meet?",
    choices: ["Informed consent", "Protection from harm", "Confidentiality", "Debriefing"],
    answer: 0,
    choiceRefs: ["informed-consent", "protection-from-harm", "confidentiality", "debriefing"],
    hint: "Focus on what participants knew at the moment they agreed to take part.",
    explanation: "Participants agreed without being told about the caffeinated drink or its possible side effects. Informed consent requires telling participants what a study involves, including its risks, before they agree.",
    feedback: [
      "Correct: participants agreed without knowing about the drink or its side effects, so their consent wasn't informed.",
      "Jitteriness is a mild risk; the clearer failure is that participants agreed without being told about it.",
      "Confidentiality concerns keeping participants' information private; nothing suggests their data were shared.",
      "Debriefing happens after a study; the failure here happened before participants agreed to take part."
    ]
  },
  {
    id: "q-informed-assent-1",
    status: "draft",
    term: "informed-assent",
    ced: ["0.7"],
    skills: ["2.D"],
    style: "prediction",
    difficulty: 4,
    stem: "Dr. Lee plans a study of math anxiety with 9-year-old students and has received signed consent forms from each child's parent. Which additional step is most needed to meet ethical guidelines?",
    choices: [
      "Having each child sign a legal consent form in place of the parent's form",
      "Explaining the study simply to each child and asking whether they agree",
      "Keeping the children unaware of the study's purpose so they behave naturally",
      "Asking each child's teacher to sign a second consent form for the school"
    ],
    answer: 1,
    choiceRefs: ["informed-consent", "informed-assent", "deception", null],
    hint: "The parents have agreed, so think about whose agreement is still missing.",
    explanation: "Children can't give legal consent, so a parent consents for them. Researchers must still explain the study in terms the child understands and get the child's own agreement, which is informed assent.",
    feedback: [
      "Children can't legally give consent, so their signature can't replace the parent's; they give assent alongside it.",
      "Correct: researchers must also get the child's own agreement, in words the child understands, which is informed assent.",
      "Hiding the purpose would be deception, which isn't needed here and would itself require justification and debriefing.",
      "A school may need to approve the study, but that doesn't replace the child's own agreement to take part."
    ]
  },
  {
    id: "q-protection-from-harm-1",
    status: "draft",
    term: "protection-from-harm",
    ced: ["0.7"],
    skills: ["2.D"],
    style: "best-example",
    difficulty: 3,
    stem: "Which of the following best illustrates a researcher's effort to protect participants from harm?",
    choices: [
      "Dr. Ruiz stores each survey in a locked file with no names attached.",
      "Dr. Bauer later tells participants that the \"other participant\" was an actor.",
      "Dr. Kaplan explains the study's risks before participants agree to join.",
      "Dr. Ito ends a stressful task early for anyone upset and offers counseling."
    ],
    answer: 3,
    choiceRefs: ["anonymity", "debriefing", "informed-consent", "protection-from-harm"],
    hint: "Look for the researcher who is reducing physical or emotional risk while the study is happening.",
    explanation: "Ending a stressful task early and offering counseling directly reduce psychological risk to participants. The other choices show anonymity, debriefing, and informed consent.",
    feedback: [
      "Locking unnamed surveys protects anonymity and privacy, a different principle from limiting physical or emotional risk.",
      "Revealing that a confederate was used is debriefing, which explains deception after the study.",
      "Explaining risks before people agree is informed consent; it informs participants but doesn't itself reduce the risks.",
      "Correct: stopping a stressful task early and offering counseling directly reduces the psychological harm participants face."
    ]
  },
  {
    id: "q-confidentiality-1",
    status: "draft",
    term: "confidentiality",
    ced: ["0.7"],
    skills: ["2.D"],
    style: "research",
    difficulty: 5,
    stem: "Dr. Moreau interviews 30 adults about past drug use. She writes each person's name on their interview notes so she can schedule follow-up interviews, keeps the notes in a locked cabinet, and publishes only group results. Which of the following statements about her procedures is most accurate?",
    choices: [
      "She protected anonymity, because no names appear in the published results.",
      "She violated confidentiality, because she recorded each participant's name.",
      "She protected confidentiality, but participants' responses were not anonymous.",
      "She protected anonymity and confidentiality, so consent was not required."
    ],
    answer: 2,
    choiceRefs: ["anonymity", "confidentiality", "confidentiality", "informed-consent"],
    hint: "Ask whether Dr. Moreau herself can tell which notes belong to which person.",
    explanation: "Dr. Moreau knows whose responses are whose, so the data are not anonymous. By locking the notes and publishing only group results, she keeps that information private, which is confidentiality.",
    feedback: [
      "Leaving names out of published results isn't anonymity; Dr. Moreau can still link each response to a person.",
      "Researchers may record names when they need them; confidentiality means keeping that information private, which she did.",
      "Correct: she knows who said what, so responses aren't anonymous, but she keeps that information private.",
      "The responses aren't anonymous, and no privacy safeguard removes the need for informed consent."
    ]
  },
  {
    id: "q-anonymity-1",
    status: "draft",
    term: "anonymity",
    ced: ["0.7"],
    skills: ["2.D"],
    style: "best-example",
    difficulty: 2,
    stem: "A school counselor wants honest answers on a survey about vaping. Which procedure would best ensure that students' responses are anonymous?",
    choices: [
      "Students put unsigned surveys in a sealed box, with no names or ID numbers.",
      "Students write their names on surveys, and the counselor promises not to share them.",
      "Students sign a form agreeing to take part before they receive the survey.",
      "Students learn the survey's true purpose after they turn it in."
    ],
    answer: 0,
    choiceRefs: ["anonymity", "confidentiality", "informed-consent", "debriefing"],
    hint: "Ask whether anyone, including the counselor, could tell who filled out each survey.",
    explanation: "With no names or ID numbers collected, no one can link a survey to the student who completed it. That is anonymity, and it encourages honest answers about sensitive behavior.",
    feedback: [
      "Correct: without names or ID numbers, no one can link a response to a student, so the responses are anonymous.",
      "A promise not to share names protects confidentiality, but the counselor can still link each answer to a student.",
      "Signing an agreement to participate is informed consent; it doesn't keep answers from being linked to students.",
      "Explaining a study's purpose afterward is debriefing; it doesn't keep responses from being traced to students."
    ]
  },
  {
    id: "q-deception-1",
    status: "draft",
    term: "deception",
    ced: ["0.7"],
    skills: ["2.D"],
    style: "explain",
    difficulty: 5,
    stem: "Dr. Sato tells participants they are in a study of visual perception, but the study actually tests whether people conform to a group's wrong answers. Her institutional review board approves the study. Which of the following best explains why this deception can be allowed?",
    choices: [
      "Deception is allowed in any study whose adult participants have signed consent forms.",
      "Knowing the real purpose would change behavior, and participants will be debriefed.",
      "Deception is allowed as long as the study's results are kept confidential.",
      "Studies of conformity involve no risk, so ethical rules about deception don't apply."
    ],
    answer: 1,
    choiceRefs: ["informed-consent", "deception", "confidentiality", null],
    hint: "Think about what would happen to the results if participants knew the study was about conformity.",
    explanation: "If participants knew the study tested conformity, they might resist going along with the group, ruining the results. Deception is allowed when it is necessary for valid results and is followed by debriefing.",
    feedback: [
      "Consent is required, but it doesn't by itself permit deception; deception must also be necessary and followed by debriefing.",
      "Correct: knowing the real purpose would change how people act, and debriefing afterward reveals the deception.",
      "Confidentiality protects participants' information, but it doesn't justify misleading them about a study's purpose.",
      "Conformity studies can cause stress or embarrassment, and rules about deception apply to every study."
    ]
  },
  {
    id: "q-debriefing-1",
    status: "draft",
    term: "debriefing",
    ced: ["0.7"],
    skills: ["2.D"],
    style: "research",
    difficulty: 1,
    stem: "At the end of a study, Dr. Ndiaye tells each participant that the \"other student\" who gave wrong answers was a member of the research team, explains the study's real goal, and answers questions. Dr. Ndiaye is",
    choices: ["obtaining informed consent", "conducting institutional review", "protecting anonymity", "debriefing participants"],
    answer: 3,
    choiceRefs: ["informed-consent", "institutional-review", "anonymity", "debriefing"],
    hint: "Notice when this conversation takes place.",
    explanation: "Explaining a study's real purpose and any deception after participation ends is debriefing.",
    feedback: [
      "Informed consent happens before a study begins, when participants learn what it involves and agree to take part.",
      "Institutional review is a committee's approval of a study before it starts, not a conversation with participants afterward.",
      "Anonymity means responses can't be linked to participants; this conversation reveals the study's purpose instead.",
      "Correct: explaining the study's real goal and the use of a confederate after the study ends is debriefing."
    ]
  },
  {
    id: "q-peer-review-1",
    status: "draft",
    term: "peer-review",
    ced: ["0.7", "0.2"],
    skills: ["2.B"],
    style: "compare",
    difficulty: 3,
    stem: "Which of the following statements about peer review is most accurate?",
    choices: [
      "It guarantees that a published finding will replicate in later studies.",
      "It is done by an institutional review board before a study begins.",
      "It helps experts catch flaws, but published findings can still be wrong.",
      "It requires researchers to repeat their own study before they can publish it."
    ],
    answer: 2,
    choiceRefs: ["replication", "institutional-review", "peer-review", "replication"],
    hint: "Consider what reviewers can and cannot check when they read a finished study.",
    explanation: "In peer review, other experts evaluate a study before it is published and can catch flaws. Reviewers can't rerun the study, though, so published findings still need replication.",
    feedback: [
      "Reviewers judge the study as written but can't rerun it; only replication shows whether a finding holds up.",
      "Institutional review approves a study's ethics before it begins; peer review evaluates the finished study before publication.",
      "Correct: other experts screen a study for flaws before publication, but replication is still needed to confirm findings.",
      "Repeating a study is replication, usually done by other researchers; peer review is experts evaluating the submitted work."
    ]
  }
];
