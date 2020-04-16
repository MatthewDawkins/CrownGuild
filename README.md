# Crown
Classic WoW Guild Website
<br>
<h1>Forking the repository</h1>
<p>To get a clone of the repo on your own github account & local files, you will need to fork a copy.</p>
<p>Forking a repository is a simple two-step process. On GitHub, navigate to the MatthewDawkins/Crown repository.
In the top-right corner of the page, click Fork.</p>
<p>Right now, you have a fork of the Crown repository, but you don't have the files in that repository on your computer. Next create a clone of your fork locally on your computer.</p>
<h2>Cloning the repository</h2>
<p>On GitHub, navigate to your fork of the Crown repository.</p>
<p>Under the repository name, click Clone or download.</p>
<p>To clone the repository using HTTPS, under "Clone with HTTPS", click the clipboard icon or copy the https url.</p>
<p>Open your Hyper terminal or Git Bash terminal</p>
<p>Type git clone, and then paste the URL you copied earlier. It will look like this, with your GitHub username instead of YOUR-USERNAME:

$ git clone https://github.com/YOUR-USERNAME/Crown</p>
<p>Press Enter. Your local clone will be created.</p>
<h2>Configure Git to sync your fork with the original Crown repository</h2>
<p>On GitHub, navigate to the MatthewDawkins/Crown repository.</p>
<p>Under the repository name, click Clone or download</p>
<p>To clone the repository using HTTPS, under "Clone with HTTPS", click the clipboard icon or copy the https url.</p>
<p>Open your Hyper terminal or Git Bash terminal</p>
<p>Change directories to the location of the fork you cloned in Step 2: Cloning the resository</p>
<p>Type git remote -v and press Enter. You'll see the current configured remote repository for your fork. It should look like this.</p>
<img src="https://i.imgur.com/Vx1b1g3.png">
<p>Type git remote add upstream, and then paste the URL you copied in Step 2 and press Enter. It will look like this:</p>
<img src="https://i.imgur.com/fBB41iM.png">
<p>To verify the new upstream repository you've specified for your fork, type git remote -v again. You should see the URL for your fork as origin, and the URL for the original repository as upstream.</p>
<img src="https://i.imgur.com/Q3VcLZP.png">
