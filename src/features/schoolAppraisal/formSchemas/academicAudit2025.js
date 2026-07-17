//contains all the schema for academic audit 2025-26 form
export const academicAudit2025Schema = {
  id: "academic-audit-2025-26",
  title: "External Academic Audit",
  academicYear: "July, 2025 - June, 2026",
  ownerRole: "director-schools",
  header: {
    university: "D Y Patil International University Akurdi Pune",
    address: "Sector 29, Pradhikaran, Akurdi, Pune - Maharashtra, INDIA 411044",
    act: "Establishment by Maharashtra Act No. LXIII of 2017",
  },
  sections: [
    {
      id: "school-department-information",
      title: "School / Department Information",
      fields: [
        { id: "schoolName", label: "Name of the School / Department" },
        { id: "establishmentYear", label: "Year of Establishment" },
        { id: "address", label: "Address", type: "textarea" },
        { id: "directorName", label: "Director's Name" },
        { id: "directorEmail", label: "Director's Mail Id", type: "email" },
        { id: "ugIntake", label: "UG Intake" },
        { id: "pgIntake", label: "PG Intake" },
        { id: "academicCalendar", label: "Academic Calendar", type: "select", options: ["Available", "Not Available"] },
      ],
      tables: [
        {
          id: "studentStrength",
          title: "Student's Strength",
          columns: ["Class", "No. of Student", "Total"],
        },
        {
          id: "facultyStrength",
          title: "Faculty Strength",
          columns: ["Required", "Available"],
        },
      ],
    },
    {
      id: "part-a-academic-activities",
      title: "Part A - Academic Activities",
      blocks: [
        {
          type: "tables",
          tables: [
            {
              id: "boardOfStudies",
              title: "1. Board of Studies meetings conducted",
              fields: [{ id: "bosMeetingsCount", label: "No. of meetings conducted" }],
              columns: ["Sr No", "Date of the meeting", "Link for MoM"],
            },
          ],
        },
        {
          type: "fields",
          fields: [
            { id: "syllabusHeading", kind: "heading", label: "2. Syllabus revision (Major/Minor) details" },
            { id: "stakeholderFeedback", label: "a. Stakeholder feedback", type: "textarea" },
            { id: "feedbackAnalysis", label: "b. Analysis of the feedback", type: "textarea" },
            { id: "actionTakenReport", label: "c. Action taken Report", type: "textarea" },
          ],
        },
        {
          type: "tables",
          tables: [
            {
              id: "syllabusRevision",
              title: "Syllabus revision feedback, analysis and ATR",
              showTitle: false,
              columns: ["Sr No", "Category of Feedback", "Link for Analysis and ATR"],
            },
          ],
        },
        {
          type: "tables",
          tables: [
            {
              id: "obeImplementation",
              title: "3. Outcome based education implementation",
              columns: ["Sr No", "Particular", "Link for the Document"],
              initialRows: [
                { "Sr No": "1", Particular: "Learning outcomes" },
                { "Sr No": "2", Particular: "Concurrent assessment" },
                { "Sr No": "3", Particular: "CO Coverage in Assessment" },
                { "Sr No": "4", Particular: "Course Exit Survey" },
              ],
            },
            {
              id: "nepStatus",
              title: "4. NEP 2020 implementation status",
              columns: ["SN", "Check Points", "Availability", "Link for the Document"],
              initialRows: [
                { SN: "1", "Check Points": "NEP Governance Structure" },
                { SN: "2", "Check Points": "Curriculum Alignment with NEP" },
                { SN: "3", "Check Points": "Multidisciplinary & Interdisciplinary Learning" },
                { SN: "4", "Check Points": "Academic Bank of Credits (ABC)" },
                { SN: "5", "Check Points": "Multiple Entry & Exit" },
                { SN: "6", "Check Points": "Skill & Vocational Education" },
                { SN: "7", "Check Points": "Experiential Learning & Internships" },
                { SN: "8", "Check Points": "Outcome Based Education (OBE)" },
                { SN: "9", "Check Points": "Technology Integration & MOOCs" },
                { SN: "10", "Check Points": "Holistic Development & Student Support" },
              ],
            },
            {
              id: "bestPractices",
              title: "5. Best Practices at School level",
              columns: ["SN", "Check Points", "Availability", "Link for the Document"],
              initialRows: [
                { SN: "1", "Check Points": "Best Practice Identification" },
                { SN: "2", "Check Points": "Detailed Implementation Plan" },
                { SN: "3", "Check Points": "Stakeholder Participation Data" },
                { SN: "4", "Check Points": "Outcome Measurement" },
                { SN: "5", "Check Points": "Impact Assessment" },
                { SN: "5(a)", "Check Points": "Quantitative Impact" },
                { SN: "5(b)", "Check Points": "Qualitative Impact" },
              ],
            },
          ],
        },
      ],
      fields: [
        { id: "bosHeading", kind: "heading", label: "1. Board of Studies meetings conducted" },
        { id: "bosMeetingsCount", label: "No. of meetings conducted" },
        { id: "syllabusHeading", kind: "heading", label: "2. Syllabus revision (Major/Minor) details" },
        { id: "stakeholderFeedback", label: "a. Stakeholder feedback", type: "textarea" },
        { id: "feedbackAnalysis", label: "b. Analysis of the feedback", type: "textarea" },
        { id: "actionTakenReport", label: "c. Action taken Report", type: "textarea" },
      ],
      tables: [
        {
          id: "boardOfStudies",
          title: "1. Board of Studies meetings conducted",
          columns: ["Sr No", "Date of the meeting", "Link for MoM"],
        },
        {
          id: "syllabusRevision",
          title: "2. Syllabus revision feedback, analysis and ATR",
          columns: ["Sr No", "Category of Feedback", "Link for Analysis and ATR"],
        },
        {
          id: "obeImplementation",
          title: "3. Outcome based education implementation",
          columns: ["Sr No", "Particular", "Link for the Document"],
          initialRows: [
            { "Sr No": "1", Particular: "Learning outcomes" },
            { "Sr No": "2", Particular: "Concurrent assessment" },
            { "Sr No": "3", Particular: "CO Coverage in Assessment" },
            { "Sr No": "4", Particular: "Course Exit Survey" },
          ],
        },
        {
          id: "nepStatus",
          title: "4. NEP 2020 implementation status",
          columns: ["SN", "Check Points", "Availability", "Link for the Document"],
          initialRows: [
            { SN: "1", "Check Points": "NEP Governance Structure" },
            { SN: "2", "Check Points": "Curriculum Alignment with NEP" },
            { SN: "3", "Check Points": "Multidisciplinary & Interdisciplinary Learning" },
            { SN: "4", "Check Points": "Academic Bank of Credits (ABC)" },
            { SN: "5", "Check Points": "Multiple Entry & Exit" },
            { SN: "6", "Check Points": "Skill & Vocational Education" },
            { SN: "7", "Check Points": "Experiential Learning & Internships" },
            { SN: "8", "Check Points": "Outcome Based Education (OBE)" },
            { SN: "9", "Check Points": "Technology Integration & MOOCs" },
            { SN: "10", "Check Points": "Holistic Development & Student Support" },
          ],
        },
        {
          id: "bestPractices",
          title: "5. Best Practices at School level",
          columns: ["SN", "Check Points", "Availability", "Link for the Document"],
          initialRows: [
            { SN: "1", "Check Points": "Best Practice Identification" },
            { SN: "2", "Check Points": "Detailed Implementation Plan" },
            { SN: "3", "Check Points": "Stakeholder Participation Data" },
            { SN: "4", "Check Points": "Outcome Measurement" },
            { SN: "5", "Check Points": "Impact Assessment" },
            { SN: "5(a)", "Check Points": "Quantitative Impact" },
            { SN: "5(b)", "Check Points": "Qualitative Impact" },
          ],
        },
      ],
    },
    {
      id: "part-b-student-development",
      title: "Part B - Student Development & Progression",
      tables: [
        {
          id: "studentMentoring",
          title: "1. Student Mentoring (mentor-wise list with mentee)",
          columns: ["Sr No", "Name of Mentor", "No. of Mentees", "Link to Document"],
        },
        {
          id: "graduatingStudents",
          title: "2. No. of students graduating (Program wise)",
          columns: ["Program", "Female", "Male", "Total"],
        },
        {
          id: "successRate",
          title: "3. Success Rate of Students (Program wise)",
          columns: [
            "Program",
            "No of Students Appeared for Final Semester Exam",
            "Number of Students cleared Program in stipulated duration of the program",
            "Success Rate %",
          ],
        },
        {
          id: "qualifyingExams",
          title: "4. Students qualifying in state / national / international level examinations",
          columns: ["Sr No", "Name of the Student", "Examination Details", "Proof as attachment"],
        },
        {
          id: "studentAwards",
          title: "5. No. of awards received by students",
          columns: ["Sr No", "Name of the Student", "Details of the Award", "Proof as an attachment"],
        },
        {
          id: "studentPlacements",
          title: "6. Number of outgoing students placed during the year",
          columns: ["Program", "No of Students Appeared for Final Year Exam", "No of Students Placed", "% Placement", "Proof as attachment"],
        },
        {
          id: "higherStudies",
          title: "7. Students Progression to Higher Studies",
          columns: ["Program", "No of Students Appeared for Final Year Exam", "No of Students selected for Higher studies", "% Students"],
        },
        {
          id: "studentStartups",
          title: "8. Student Start-up details",
          columns: ["SN", "Name of the Student", "Name of the Venture / Start-up", "Link to relevant Proof"],
        },
        {
          id: "studentCourses",
          title: "9. MOOCs / Value added / skill development courses completed by the students",
          columns: ["Sr No", "Name of Student", "Year of Study", "Name of course", "Duration", "Link to relevant Proof"],
        },
        {
          id: "alumniInteractions",
          title: "10. Details of alumni interactions of the Department / School with present students",
          columns: ["Sr No", "Name of Alumni", "Designation", "Present employer", "Date on interaction", "Topic", "No of beneficiaries", "Link to relevant Proof"],
        },
        {
          id: "guestLectures",
          title: "11. Number of guest lectures / workshops / seminars conducted for students",
          columns: ["Sr No", "Name of the Resource person", "Designation and organization", "Date of conduction", "Topic", "Number of beneficiaries", "Link to relevant Proof"],
        },
        {
          id: "professionalBodies",
          title: "12. Details of the Professional Body association & Student clubs",
          columns: ["Sr no", "Name of the Professional body / chapter / student club", "No of student members", "Date of event conduction", "Title of the event", "Link to relevant Proof"],
        },
        {
          id: "valueAddedCourses",
          title: "13. Details of Value added / Skill development courses conducted for students",
          columns: ["Sr no", "Title of the Course", "Details of resource person", "Duration and date of conduction", "No of beneficiaries", "Link to relevant Proof"],
        },
        {
          id: "careerGuidance",
          title: "15. Number of career guidance sessions organized",
          columns: ["Sr No", "Session details", "Resource person details", "Date of conduction", "Number of beneficiaries", "Link to relevant Proof"],
        },
        {
          id: "extensionActivities",
          title: "16. Number of Extension conducted / attended / participated",
          columns: ["Sr No", "Activity details", "Organized by", "Date of conduction", "Number of beneficiaries", "Link to relevant Proof"],
        },
      ],
    },
    {
      id: "part-c-faculty-research",
      title: "Part C - Faculty Development & Research Activities",
      blocks: [
        {
          type: "tables",
          tables: [
            {
              id: "facultySpecialization",
              title: "1. Faculty strength and specialization",
              columns: ["Sr. No.", "Name", "Designation", "Qualifications", "Specialization", "No. of Ph.D supervised"],
            },
            {
              id: "researchPublications",
              title: "2. Research Publications in the Journals notified on UGC website during the year",
              columns: ["Title of paper", "Name of author(s)", "Name of Journal", "Year of Publication with Volume and Page numbers", "ISBN/ISSN", "Indicate UGC Approved Journal", "National/International Journal", "Impact Factor", "Link to relevant Proof"],
            },
            {
              id: "booksChapters",
              title: "3. Books and Chapters in edited Volumes / Books published, and papers in Conference Proceedings",
              columns: ["Name of the teacher", "Title of the book/chapters published", "Title of the paper", "Title of the proceedings of the conference", "Name of the conference", "National / international", "Year of publication", "ISBN/ISSN number", "Name of the publisher", "Link to relevant Proof"],
            },
            {
              id: "corporateTraining",
              title: "4. Revenue generated from corporate training by the Department",
              columns: ["Sr No", "Name of faculty", "Agency seeking / training", "Revenue generated", "Number of trainees", "Link to relevant Proof"],
            },
            {
              id: "consultancy",
              title: "5. Revenue generated from Consultancy by the Department",
              columns: ["Name of the faculty", "Title of the consultancy project", "Consulting/Sponsoring Agency", "Revenue generated", "Link to relevant Proof"],
            },
            {
              id: "researchFunds",
              title: "6. Research funds sanctioned and received from various agencies, industry and other organizations",
              columns: ["Sr No", "Name of the Project / Endowments / Chairs", "Name of the Principal Investigator", "Department of Principal Investigator", "Year of Award", "Funds provided", "Duration of the project", "Link to relevant Proof"],
            },
            {
              id: "eContents",
              title: "7. E-Contents developed",
              columns: ["Sr No", "Name of the teacher", "Name of the module", "Platform on which module is developed", "Date of launching e content", "Link to relevant Proof"],
            },
            {
              id: "teacherAwards",
              title: "8. Teachers who received national / international fellowship / financial support",
              columns: ["Name of the Teacher", "National Awards", "International Awards", "Link to relevant Proof"],
            },
            {
              id: "patentsCopyrights",
              title: "Number of Patents / copyright filed / published / awarded",
              columns: ["Sr. No", "Name of Faculty / Student", "Application No", "Title of Patent / Copyright", "Date of filing", "Date of publication", "Date of award", "Link to relevant Proof"],
            },
            {
              id: "fdpOrganized",
              title: "9. Details of seminar / symposia / conference / refresher course / training programmes organized",
              columns: ["Sl. No", "Name of Convener/Coordinator", "Title of seminar/course", "Sponsoring Agency", "Duration with dates", "No. of internal and external participants", "Proceedings published Yes/No", "Link to relevant Proof"],
            },
            {
              id: "fdpAttended",
              title: "Details of seminar / symposia / conference / refresher course / training programmes attended by faculty",
              columns: ["Sl. No", "Name of Faculty", "Title of seminar/course", "Sponsoring Agency / organization", "Duration with dates", "Date", "Link to relevant Proof"],
            },
          ],
        },
        {
          type: "fields",
          fields: [
            { id: "collaborationsHeading", kind: "heading", label: "10. Collaborations" },
            { id: "foreignCollaborations", label: "(a) No. of foreign collaborations either in the form of publications / research", type: "textarea" },
            { id: "nationalCollaborations", label: "(b) No. of collaborations with other national institutions", type: "textarea" },
            { id: "functionalMousHeading", kind: "heading", label: "11. Functional MoUs" },
            { id: "functionalMousCount", label: "No. of Functional MoUs" },
          ],
        },
        {
          type: "tables",
          tables: [
            {
              id: "functionalMous",
              title: "11. Functional MoUs",
              columns: ["Sr No", "Name of the Organization / Institution / Industry with whom MoU is signed", "Year of signing MoU", "Duration of MoU", "List the actual activities under each MoU", "Link to relevant Proof"],
            },
          ],
        },
      ],
      fields: [
        { id: "collaborationsHeading", kind: "heading", label: "10. Collaborations" },
        { id: "foreignCollaborations", label: "(a) No. of foreign collaborations either in the form of publications / research", type: "textarea" },
        { id: "nationalCollaborations", label: "(b) No. of collaborations with other national institutions", type: "textarea" },
        { id: "functionalMousHeading", kind: "heading", label: "11. Functional MoUs" },
        { id: "functionalMousCount", label: "No. of Functional MoUs" },
      ],
      tables: [
        {
          id: "facultySpecialization",
          title: "1. Faculty strength and specialization",
          columns: ["Sr. No.", "Name", "Designation", "Qualifications", "Specialization", "No. of Ph.D supervised"],
        },
        {
          id: "researchPublications",
          title: "2. Research Publications in the Journals notified on UGC website during the year",
          columns: ["Title of paper", "Name of author(s)", "Name of Journal", "Year of Publication with Volume and Page numbers", "ISBN/ISSN", "Indicate UGC Approved Journal", "National/International Journal", "Impact Factor", "Link to relevant Proof"],
        },
        {
          id: "booksChapters",
          title: "3. Books and Chapters in edited Volumes / Books published, and papers in Conference Proceedings",
          columns: ["Name of the teacher", "Title of the book/chapters published", "Title of the paper", "Title of the proceedings of the conference", "Name of the conference", "National / international", "Year of publication", "ISBN/ISSN number", "Name of the publisher", "Link to relevant Proof"],
        },
        {
          id: "corporateTraining",
          title: "4. Revenue generated from corporate training by the Department",
          columns: ["Sr No", "Name of faculty", "Agency seeking / training", "Revenue generated", "Number of trainees", "Link to relevant Proof"],
        },
        {
          id: "consultancy",
          title: "5. Revenue generated from Consultancy by the Department",
          columns: ["Name of the faculty", "Title of the consultancy project", "Consulting/Sponsoring Agency", "Revenue generated", "Link to relevant Proof"],
        },
        {
          id: "researchFunds",
          title: "6. Research funds sanctioned and received from various agencies, industry and other organizations",
          columns: ["Sr No", "Name of the Project / Endowments / Chairs", "Name of the Principal Investigator", "Department of Principal Investigator", "Year of Award", "Funds provided", "Duration of the project", "Link to relevant Proof"],
        },
        {
          id: "eContents",
          title: "7. E-Contents developed",
          columns: ["Sr No", "Name of the teacher", "Name of the module", "Platform on which module is developed", "Date of launching e content", "Link to relevant Proof"],
        },
        {
          id: "teacherAwards",
          title: "8. Teachers who received national / international fellowship / financial support",
          columns: ["Name of the Teacher", "National Awards", "International Awards", "Link to relevant Proof"],
        },
        {
          id: "patentsCopyrights",
          title: "Number of Patents / copyright filed / published / awarded",
          columns: ["Sr. No", "Name of Faculty / Student", "Application No", "Title of Patent / Copyright", "Date of filing", "Date of publication", "Date of award", "Link to relevant Proof"],
        },
        {
          id: "fdpOrganized",
          title: "9. Details of seminar / symposia / conference / refresher course / training programmes organized",
          columns: ["Sl. No", "Name of Convener/Coordinator", "Title of seminar/course", "Sponsoring Agency", "Duration with dates", "No. of internal and external participants", "Proceedings published Yes/No", "Link to relevant Proof"],
        },
        {
          id: "fdpAttended",
          title: "Details of seminar / symposia / conference / refresher course / training programmes attended by faculty",
          columns: ["Sl. No", "Name of Faculty", "Title of seminar/course", "Sponsoring Agency / organization", "Duration with dates", "Date", "Link to relevant Proof"],
        },
        {
          id: "functionalMous",
          title: "Functional MoUs",
          columns: ["Sr No", "Name of the Organization / Institution / Industry with whom MoU is signed", "Year of signing MoU", "Duration of MoU", "List the actual activities under each MoU", "Link to relevant Proof"],
        },
      ],
    },
    {
      id: "part-d-swoc",
      title: "Part D - SWOC Analysis",
      tables: [
        {
          id: "swocStrength",
          title: "Strength",
          columns: ["Sr No", "Details"],
          initialRows: [{ "Sr No": "1", Details: "" }],
        },
        {
          id: "swocWeaknesses",
          title: "Weaknesses",
          columns: ["Sr No", "Details"],
          initialRows: [{ "Sr No": "1", Details: "" }],
        },
        {
          id: "swocOpportunities",
          title: "Opportunities",
          columns: ["Sr No", "Details"],
          initialRows: [{ "Sr No": "1", Details: "" }],
        },
        {
          id: "swocChallenges",
          title: "Challenges",
          columns: ["Sr No", "Details"],
          initialRows: [{ "Sr No": "1", Details: "" }],
        },
        {
          id: "swocOtherInformation",
          title: "Any other information, which is not covered above",
          columns: ["Sr No", "Details"],
          initialRows: [{ "Sr No": "1", Details: "" }],
        },
      ],
    },
    {
      id: "part-e-observations",
      title: "Part E - Observations & Recommendations of the Audit",
      fields: [
        { id: "auditObservations", label: "Observations of the Academic Audit Team", type: "textarea" },
        { id: "auditRecommendations", label: "Recommendations of the Audit Team", type: "textarea" },
        { id: "auditDocumentation", label: "Upload Documentation", type: "file" },
      ],
    },
  ],
};
