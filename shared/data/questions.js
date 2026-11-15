/* AP Psychology practice questions: window.APPSYCH_QUESTIONS
 * One question per term in terms.js (linked by `term`). Written for this site; no copied exam or textbook items.
 * Games shuffle `choices` (keeping `answer` and `feedback` aligned) unless `shuffle` is false.
 */
window.APPSYCH_QUESTIONS = [
  // ===== Science Practices =====
  // perspectives
  {
    id: "q-psychology-1",
    term: "psychology",
    ced: ["0.1"],
    skills: ["1.A"],
    style: "explain",
    difficulty: 2,
    stem: "Mateo tells his friend that psychology is just common sense, because most of its findings seem obvious once people hear them. Which of the following best explains why psychologists still test ideas that seem obvious?",
    choices: [
      "Psychology studies only observable behavior, so common sense about thoughts and feelings does not apply.",
      "Mental processes cannot be measured directly, so psychologists must rely on research about behavior instead.",
      "Ideas that seem obvious after the fact are sometimes wrong, so they must be tested systematically.",
      "Common-sense ideas come from the psychodynamic perspective, which modern psychologists no longer accept."
    ],
    answer: 2,
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
    term: "psychodynamic-perspective",
    ced: ["0.1", "5.3.B.3"],
    skills: ["1.A"],
    style: "scenario",
    difficulty: 1,
    stem: "Dr. Haddad believes that Leo's intense fear of being abandoned by his friends comes from conflicts with his parents in early childhood that Leo is not consciously aware of. Dr. Haddad's explanation best reflects which perspective?",
    choices: ["Psychodynamic", "Humanistic", "Cognitive", "Behavioral"],
    answer: 0,
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
    term: "behavioral-perspective",
    ced: ["0.1", "3.7.A.1"],
    skills: ["1.A"],
    style: "prediction",
    difficulty: 1,
    stem: "Dr. Brennan uses the behavioral perspective to study why 4-year-old Sofia throws tantrums at the grocery store. Which of the following is Dr. Brennan most likely to investigate?",
    choices: [
      "Sofia's beliefs about what is fair when she is told no",
      "Differences in Sofia's brain activity during tantrums",
      "Sofia's unconscious feelings of anger toward her parents",
      "What usually happens right after Sofia's tantrums begin"
    ],
    answer: 3,
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
    term: "humanistic-perspective",
    ced: ["0.1", "4.4.B.1"],
    skills: ["1.A"],
    style: "scenario",
    difficulty: 2,
    stem: "Ms. Alvarez, a school counselor, tells Kofi, who is failing two classes, that she values him no matter what grades he earns and that she believes he can grow into the person he wants to become. Ms. Alvarez's approach best reflects which perspective?",
    choices: ["Cognitive", "Humanistic", "Psychodynamic", "Sociocultural"],
    answer: 1,
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
    term: "biological-perspective",
    ced: ["0.1"],
    skills: ["1.A"],
    style: "scenario",
    difficulty: 1,
    stem: "After a car accident damaged part of his frontal lobe, Marcus began making impulsive decisions he never would have made before. His doctor explains the change as a result of the injury to his brain tissue. The doctor's explanation reflects which perspective?",
    choices: ["Cognitive", "Biological", "Evolutionary", "Psychodynamic"],
    answer: 1,
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
    term: "cognitive-perspective",
    ced: ["0.1", "5.3.B.5"],
    skills: ["1.A"],
    style: "scenario",
    difficulty: 2,
    stem: "Jaylen believes that if he makes a single mistake at his piano recital, everyone in the audience will decide he is a failure. A psychologist explains that this way of interpreting situations is the main cause of Jaylen's anxiety. The psychologist's explanation best reflects which perspective?",
    choices: ["Behavioral", "Psychodynamic", "Humanistic", "Cognitive"],
    answer: 3,
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
    term: "cultural-norms",
    ced: ["0.1", "5.3.A.1", "5.3.A.2"],
    skills: ["1.B"],
    style: "explain",
    difficulty: 2,
    stem: "Before deciding whether a client's behavior is part of a psychological disorder, Dr. Mwangi asks whether the behavior is typical in the client's culture. Which of the following best explains why she does this?",
    choices: [
      "A person's culture determines which psychological disorders the person can inherit.",
      "Behaviors that are common in a culture cannot cause distress or problems in daily life.",
      "Psychologists must judge every client by the norms of the psychologist's own culture.",
      "A behavior that seems unusual in one culture may be expected and healthy in another."
    ],
    answer: 3,
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
    term: "research-design",
    ced: ["0.2"],
    skills: ["2.A"],
    style: "research",
    difficulty: 1,
    stem: "Dr. Mensah wants to find out whether a new reading app causes second graders to earn higher reading scores. Which research design would best allow her to reach this conclusion?",
    choices: ["Experiment", "Correlational study", "Case study", "Naturalistic observation"],
    answer: 0,
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
    term: "experiment",
    ced: ["0.2"],
    skills: ["2.A"],
    style: "compare",
    difficulty: 2,
    stem: "Which of the following statements best distinguishes an experiment from a correlational study?",
    choices: [
      "Only an experiment uses numbers, so its results are more precise.",
      "Only an experiment manipulates a variable, so it can test cause and effect.",
      "Only a correlational study measures two variables, so it can show which causes the other.",
      "Only a correlational study uses a sample, so its results can be generalized."
    ],
    answer: 1,
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
    term: "theory",
    ced: ["0.2"],
    skills: ["2.B"],
    style: "scenario",
    difficulty: 2,
    stem: "After reviewing many studies showing that people remember more when practice is spread out, Dr. Lin proposes a broad explanation of why spacing helps memory. She then predicts that students who take weekly quizzes will score higher on a final exam than students who take one review quiz. Dr. Lin's broad explanation and her specific prediction are best described as",
    choices: [
      "a theory and a hypothesis, respectively",
      "a hypothesis and a theory, respectively",
      "a theory and an operational definition, respectively",
      "a replication and a hypothesis, respectively"
    ],
    answer: 0,
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
    term: "falsifiable",
    ced: ["0.2"],
    skills: ["2.B"],
    style: "best-example",
    difficulty: 2,
    stem: "Students in Ms. Park's class submitted hypotheses for a research project. Which of the following hypotheses is falsifiable?",
    choices: [
      "Every person has an invisible energy that guides behavior in ways no test can detect.",
      "Some people may sometimes behave differently when they are around other people.",
      "Dreams are secret messages from a part of the mind that can never be observed.",
      "Students who sleep 8 hours will outscore students who sleep 5 hours on a math quiz."
    ],
    answer: 3,
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
    term: "operational-definitions",
    ced: ["0.2"],
    skills: ["2.B"],
    style: "research",
    difficulty: 2,
    stem: "Dr. Chen is testing whether 20 minutes of exercise reduces stress in college students. Which of the following is the best operational definition of stress for her study?",
    choices: [
      "How tense, worried, or overwhelmed participants feel in their daily lives",
      "Scores on a 10-item stress questionnaire given after a timed math task",
      "The body's natural reaction to demanding or threatening events",
      "Whether participants report exercising at least three times per week"
    ],
    answer: 1,
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
    term: "replication",
    ced: ["0.2"],
    skills: ["2.B"],
    style: "research",
    difficulty: 2,
    stem: "Dr. Fischer found that students who studied with background music recalled more words than students who studied in silence. Five other research teams then repeated her exact procedure with new participants, and none found a difference between the groups. Which of the following is the most appropriate conclusion?",
    choices: [
      "The original study is still the most accurate because it was published first.",
      "The later studies failed because they used different participants.",
      "The original finding is doubtful because it was not replicated.",
      "Background music improves memory only for the participants in Dr. Fischer's sample."
    ],
    answer: 2,
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
    term: "case-study",
    ced: ["0.2"],
    skills: ["2.A", "2.C"],
    style: "research",
    difficulty: 3,
    stem: "Dr. Lindqvist wants to learn as much as possible about a 12-year-old girl with a rare condition that prevents her from feeling fear. Over two years, he interviews the girl, her family, and her teachers and gives her dozens of tests. Which of the following is the main limitation of this method?",
    choices: [
      "Findings about one person may not apply to other people.",
      "It provides too little detail about the girl's life.",
      "It requires randomly assigning the girl to a group.",
      "It can collect only numerical data, not descriptions."
    ],
    answer: 0,
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
    term: "correlation",
    ced: ["0.2"],
    skills: ["2.C"],
    style: "research",
    difficulty: 2,
    stem: "Researchers surveyed 1,200 teens and found a strong positive correlation between hours spent on social media each day and loneliness scores. Which of the following conclusions is best supported by these results?",
    choices: [
      "Spending time on social media causes teens to feel lonely.",
      "Feeling lonely causes teens to spend more time on social media.",
      "Teens who cut back on social media will become less lonely.",
      "Teens who use more social media tend to report more loneliness."
    ],
    answer: 3,
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
    term: "survey",
    ced: ["0.2"],
    skills: ["2.C"],
    style: "research",
    difficulty: 1,
    stem: "Dr. Patel wants to estimate how many hours of homework high school students across her state complete each week. Which method would let her collect this information from the largest number of students most efficiently?",
    choices: ["Case study", "Survey", "Naturalistic observation", "Experiment"],
    answer: 1,
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
    term: "meta-analysis",
    ced: ["0.2", "5.5.A.1"],
    skills: ["2.A"],
    style: "research",
    difficulty: 2,
    stem: "Dr. Russo gathers 85 published studies on whether psychotherapy reduces symptoms of depression. He statistically combines their results and reports one overall estimate of how effective therapy is. Which method did Dr. Russo use?",
    choices: ["Meta-analysis", "Replication", "Correlational study", "Survey"],
    answer: 0,
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
    term: "structured-interviews",
    ced: ["0.2"],
    skills: ["2.B", "2.C"],
    style: "research",
    difficulty: 3,
    stem: "Dr. Nguyen and three assistants will interview first-year teachers at ten schools about their biggest challenges. She wants rich descriptions in the teachers' own words, and she wants answers to be comparable across interviewers. Which approach best meets both goals?",
    choices: [
      "Letting each interviewer choose questions based on how the conversation goes",
      "Having each teacher rate their stress level on a scale from 1 to 7",
      "Asking every teacher the same open-ended questions in the same order",
      "Watching teachers in their classrooms without speaking to them"
    ],
    answer: 2,
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
    term: "qualitative-measures",
    ced: ["0.2"],
    skills: ["2.B", "2.C"],
    style: "research",
    difficulty: 1,
    stem: "Dr. Ellis is studying students' experiences after they transfer to a new high school. Which of the following would give her qualitative data?",
    choices: [
      "The number of friends each student lists after one month",
      "Each student's rating of belonging on a scale from 1 to 5",
      "Attendance records for each student's first semester",
      "Students' written descriptions of their first week at school"
    ],
    answer: 3,
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
    term: "dependent-variables",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "research",
    difficulty: 1,
    stem: "Dr. Soto randomly assigns students to study a list of vocabulary words for 30 minutes, either with flashcards or by rereading their notes. A week later, every student takes the same 20-question quiz, and she records their scores. What is the dependent variable?",
    choices: ["Study method", "Length of the study session", "Random assignment to groups", "Quiz scores"],
    answer: 3,
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
    term: "confounding-variables",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "research",
    difficulty: 3,
    stem: "Dr. Larsen tests whether a new math curriculum raises test scores. The class using the new curriculum meets in the morning with a teacher who has 20 years of experience; the class using the old curriculum meets in the afternoon with a first-year teacher. The new-curriculum class scores higher. Which of the following is the most serious problem with concluding that the curriculum caused the difference?",
    choices: [
      "Test scores are not a valid way to measure math learning.",
      "Teacher experience and class time also differed between the classes.",
      "The old-curriculum class should have received a placebo curriculum.",
      "Neither class knew which curriculum the researchers expected to work."
    ],
    answer: 1,
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
    term: "experimental-group",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "research",
    difficulty: 1,
    stem: "Dr. Moreno studies whether a 10-minute daily meditation app reduces anxiety in nurses. Half of the nurses, chosen at random, use the app for a month, while the other half continue their normal routines. All the nurses then complete an anxiety survey. The nurses who used the app make up the",
    choices: ["experimental group", "control group", "placebo group", "dependent variable"],
    answer: 0,
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
    term: "control-group",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "explain",
    difficulty: 2,
    stem: "Researchers testing whether a new after-school tutoring program raises grades include a group of students who do not receive tutoring. Which of the following best explains why this group is needed?",
    choices: [
      "It ensures that every student in the study benefits from tutoring equally.",
      "It lets researchers know which students are in which group throughout the study.",
      "It provides a baseline that shows how grades change without tutoring.",
      "It removes the need to randomly assign students to the different groups."
    ],
    answer: 2,
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
    id: "q-random-assignment-1",
    term: "random-assignment",
    ced: ["0.3"],
    skills: ["2.A", "2.B"],
    style: "research",
    difficulty: 2,
    stem: "Dr. Iqbal wants to test whether standing desks improve students' attention in class. Which procedure for deciding which students get standing desks is best?",
    choices: [
      "Letting students who want standing desks volunteer to use them",
      "Giving standing desks to first period and regular desks to sixth period",
      "Giving standing desks to students with the lowest attention scores",
      "Drawing names from a hat to decide which students get standing desks"
    ],
    answer: 3,
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
    term: "placebo-effect",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "scenario",
    difficulty: 2,
    stem: "In a study on pain, participants who swallowed sugar pills that they were told were strong painkillers reported much less pain than participants who received no pills. This difference is best explained by",
    choices: ["experimenter bias", "social desirability bias", "the placebo effect", "random assignment"],
    answer: 2,
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
    id: "q-single-blind-study-1",
    term: "single-blind-study",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "research",
    difficulty: 3,
    stem: "In Dr. Walker's study of a new sleep aid, participants do not know whether they received the real pill or a placebo. Dr. Walker, who interviews participants and rates their sleep quality, knows which pill each person received. Which of the following best describes this study?",
    choices: [
      "Single-blind, with a risk of experimenter bias",
      "Double-blind, with a risk of experimenter bias",
      "Single-blind, with no way to detect a placebo effect",
      "Double-blind, with no remaining risk of bias"
    ],
    answer: 0,
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
    term: "double-blind-study",
    ced: ["0.3"],
    skills: ["2.B"],
    style: "prediction",
    difficulty: 3,
    stem: "Dr. Amari's antidepressant study is single-blind: participants don't know whether they got the drug or a placebo, but the assistants who rate participants' mood do know. If she changes the study so the assistants also don't know, which outcome is most likely?",
    choices: [
      "The placebo group will stop reporting any improvement in mood.",
      "Participants will be more likely to guess which pill they received.",
      "The study will no longer need a placebo for the control group.",
      "Assistants' expectations will be less likely to sway their ratings."
    ],
    answer: 3,
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
    term: "research-confederates",
    ced: ["0.3", "0.7"],
    skills: ["2.B", "2.D"],
    style: "scenario",
    difficulty: 1,
    stem: "In a study on helping behavior, a man who appears to be another participant drops a stack of papers in the hallway, and researchers record whether the real participant stops to help. The man actually works for the researchers. He is best described as",
    choices: ["a member of the control group", "a research confederate", "the dependent variable", "a placebo"],
    answer: 1,
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
    term: "confirmation-bias",
    ced: ["0.4", "4.2.B.1"],
    skills: ["1.B"],
    style: "scenario",
    difficulty: 2,
    stem: "Coach Ramírez believes left-handed pitchers get more nervous under pressure. Over the season, he remembers every time a left-hander walked a batter in a close game but forgets the same mistakes made by right-handers. Coach Ramírez is showing",
    choices: ["confirmation bias", "hindsight bias", "overconfidence", "experimenter bias"],
    answer: 0,
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
    term: "overconfidence",
    ced: ["0.4"],
    skills: ["1.B", "3.A"],
    style: "research",
    difficulty: 3,
    stem: "Dr. Kowalski had 200 students answer trivia questions and rate how sure they were of each answer before seeing the correct answers. The results:\nAnswers rated \"100% sure\": 74% correct\nAnswers rated \"80% sure\": 61% correct\nAnswers rated \"60% sure\": 52% correct\nThese results best demonstrate",
    choices: ["hindsight bias", "overconfidence", "confirmation bias", "social desirability bias"],
    answer: 1,
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
    term: "experimenter-bias",
    ced: ["0.4"],
    skills: ["2.B"],
    style: "research",
    difficulty: 2,
    stem: "Dr. Holt believes a new writing program improves students' essays. When scoring essays at the end of the study, she knows which students used the program, and she gives those essays slightly higher scores. Which of the following changes would best reduce this problem?",
    choices: [
      "Giving the writing program to more students",
      "Telling the students which group they are in",
      "Having students score their own essays",
      "Having scorers who don't know the groups"
    ],
    answer: 3,
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
    term: "social-desirability-bias",
    ced: ["0.4"],
    skills: ["2.C"],
    style: "explain",
    difficulty: 2,
    stem: "A school asks students the same question on two surveys: \"How often have you copied someone else's homework?\" On the version that requires names, 8% report copying; on an anonymous version given to a similar group of students, 41% do. Which of the following best explains the difference?",
    choices: [
      "Students worry less about being judged when answers are anonymous.",
      "The anonymous survey used more favorable wording about copying.",
      "Students remember their own behavior more accurately without names.",
      "The anonymous survey was given to a much larger sample of students."
    ],
    answer: 0,
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
    term: "self-report-bias",
    ced: ["0.4"],
    skills: ["2.C"],
    style: "compare",
    difficulty: 3,
    stem: "Which of the following statements about self-report bias is most accurate?",
    choices: [
      "It occurs only when participants are trying to make themselves look good.",
      "It can be eliminated by having participants answer every item on a Likert scale.",
      "It can occur on anonymous surveys because people misjudge their own behavior.",
      "It affects naturalistic observation more than it affects surveys."
    ],
    answer: 2,
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
    term: "wording-effect",
    ced: ["0.4"],
    skills: ["2.C"],
    style: "research",
    difficulty: 3,
    stem: "A school randomly split its students into two halves for a survey. Half were asked, \"Should the school forbid phones during lunch?\" and 34% said yes. The other half were asked, \"Should the school not allow phones during lunch?\" and 57% said yes. Which of the following best explains the difference in results?",
    choices: ["Sampling bias", "Wording effect", "Confirmation bias", "Social desirability bias"],
    answer: 1,
    hint: "The two groups were similar, so what else differed between the two versions?",
    explanation: "Both questions ask about the same policy, but \"forbid\" sounds stronger than \"not allow,\" so fewer students agreed with it. A change in answers caused by phrasing is the wording effect.",
    feedback: [
      "Sampling bias occurs when a sample doesn't represent the population; the halves were formed randomly, so they should be similar.",
      "Correct: both questions describe the same policy, but \"forbid\" sounds harsher than \"not allow,\" which changed responses.",
      "Confirmation bias is favoring evidence that supports one's beliefs; it doesn't explain why two similar groups answered differently.",
      "Social desirability bias would push both groups in the same direction; only the phrasing of the question differed."
    ]
  }
];
