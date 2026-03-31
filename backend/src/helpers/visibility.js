function getVoteWeight(roleCode) {
  switch (roleCode) {
    case 'super_admin':
      return 5;
    case 'cdc_admin':
      return 4;
    case 'alumni':
      return 2;
    default:
      return 1;
  }
}

module.exports = {
  getVoteWeight,
};
