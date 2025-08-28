function isAdminUser(tabs) {
    // console.log("tabs length",tabs?.length,"process.env.TOTALTABS",process.env.TOTALTABS);
    
      const requiredPermissions = ['visibility', 'create', 'read', 'update', 'delete'];
      if (!tabs || tabs.length !== parseInt(process.env.TOTALTABS)) {
        return false;
      }
    
      return tabs.every(tab => 
        requiredPermissions.every(permission => tab[permission] === true)
      );
    }
  
    module.exports = isAdminUser;