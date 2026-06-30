export const emptySubmissionConfirmation = {
  detailsVerified: false,
  documentsUploaded: false,
};

export const isSubmissionConfirmed = (value = emptySubmissionConfirmation) =>
  Boolean(value.detailsVerified && value.documentsUploaded);
