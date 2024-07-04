exports.get404 = (req, res, next) => {
  const isadmin = req.session.user && req.session.user.role === 0;
  res.status(404).render('404', {
    pageTitle: 'Page Not Found',
    path: '/404',
    isauthenticated: req.session.isLoggedIn ,
    isadmin:isadmin
  });
};

exports.get500 = (req, res, next) => {
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isauthenticated: req.session.isLoggedIn
  });
};
