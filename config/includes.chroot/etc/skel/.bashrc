# NSK OS bash profile
case $- in *i*) ;; *) return;; esac
export PS1='\[\e[32m\]nsk@nskos\[\e[0m\]:\[\e[34m\]\w\[\e[0m\]\$ '
alias ll='ls -lah --color=auto'
alias la='ls -A'
alias l='ls -CF'
