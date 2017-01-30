# Fisher's Exact Script
# By Hannah De los Santos, 8/4/16

# The function of this code is to perform enrichment for diseases and pathways using Fisher's Exact
# Test.

# contingency table:
#                       In Enrichment Group   Not In Enrichment Group
# In Gene Cluster         n11                 n12
# Not In Gene Cluster     n21                 n22

# Load In Data -------------------

# this section needs to result in the following, according to the contingency table given above
n11 <- input[[1]]
n21 <- input[[2]]
n12 <- input[[3]]
n22 <- input[[4]]

# Fisher's Exact Test ------------
# putting the values in a matrix
X <- matrix(c(n11,n12,n21,n22),nrow=2,ncol = 2, byrow = TRUE)

# implement the fisher's exact test
# choices:
# hypothesized odds ratio = 1
# alternative hypothesis = two sided
# confidence level = 95
pval <- fisher.test(X)$p.value
