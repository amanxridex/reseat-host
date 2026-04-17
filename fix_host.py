import re

with open("c:\\Users\\91836\\NEXUS SUPER\\reseat-host\\host-signup-login.html", "r", encoding="utf-8") as f:
    content = f.read()

# Replace other events
content = content.replace("onclick=\"selectSubcat('other', this)\"", "onclick=\"selectSubcat('comedy_show', this)\"")
content = content.replace("<div class=\"title\">Other Events</div>", "<div class=\"title\">Comedy Shows</div>")
content = content.replace("<div class=\"desc\">Comedy shows, workshops, networking</div>", "<div class=\"desc\">Stand-up comedy, open mics</div>")
content = content.replace("<div class=\"subcat-item-icon\">✨</div>", "<div class=\"subcat-item-icon\">🎤</div>")

with open("c:\\Users\\91836\\NEXUS SUPER\\reseat-host\\host-signup-login.html", "w", encoding="utf-8") as f:
    f.write(content)

print("done")
