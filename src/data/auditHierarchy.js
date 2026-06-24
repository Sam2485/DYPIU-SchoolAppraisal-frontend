export const auditHierarchy = {
  title: "Academic & Administrative Audit",
  adminRole: {
    id: "vc-iqac",
    label: "VC & IQAC",
  },
  userRoles: [
    {
      id: "director-schools",
      label: "Director of Schools",
      auditType: "academic",
    },
    {
      id: "registrar",
      label: "Registrar",
      auditType: "administrative",
    },
    {
      id: "hr",
      label: "HR",
      auditType: "administrative",
    },
    {
      id: "dean-student-welfare",
      label: "Dean Student Welfare",
      auditType: "administrative",
    },
    {
      id: "dean-placement",
      label: "Dean Placement",
      auditType: "administrative",
    },
  ],
};
