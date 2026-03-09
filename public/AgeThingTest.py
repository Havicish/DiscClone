import random
import math
import rich
from rich import console

RichConsole = console.Console()

randomWords = [
  "apple","river","mountain","cloud","forest","ocean","tree","stone","light","shadow",
  "wind","fire","earth","metal","water","sun","moon","star","sky","field",
  "grass","flower","bird","wolf","lion","tiger","bear","fox","deer","horse",
  "dog","cat","mouse","snake","frog","whale","shark","fish","shell","sand",
  "desert","island","valley","hill","road","bridge","tower","castle","village","city",
  "garden","window","door","floor","wall","roof","chair","table","bed","lamp",
  "book","paper","pen","pencil","brush","paint","music","song","sound","voice",
  "dream","night","day","morning","evening","winter","spring","summer","autumn","rain",
  "snow","storm","thunder","lightning","fog","ice","heat","cold","smoke","dust",
  "gold","silver","copper","iron","steel","glass","cloth","wool","cotton","silk",
  "bread","cheese","milk","butter","fruit","berry","grape","lemon","peach","pear"
]

first_names = [
    "alex", "jordan", "taylor", "morgan", "casey", "riley", "jamie",
    "drew", "cameron", "logan", "blake", "devon", "skyler", "quinn",
    "reese", "parker", "rowan", "harper", "avery", "emerson"
]

last_names = [
    "smith", "johnson", "brown", "williams", "miller", "davis",
    "wilson", "anderson", "thomas", "moore", "martin", "lee",
    "clark", "hall", "allen", "young", "king", "wright", "scott", "green"
]

usernames = []

while len(usernames) < 1000:
    name = random.choice(first_names) + "_" + random.choice(last_names)
    if random.random() < 0.7:
        name += str(random.randint(1, 9999))
    usernames.append(name)

class RobloxMessage:
  def __init__(self, Username, Msg, AgeGroup, UserColor="#FFFFFF"):
    self.Username = Username
    self.Msg = Msg
    self.AgeGroup = AgeGroup
    self.UserColor = UserColor

  def Print(self):
    RichConsole.print(f"[{self.UserColor}]{self.Username}[/]: {self.Msg} (Group: {self.AgeGroup})")

  def __repr__(self):
    return f"{self.Username}: {self.Msg} (Group: {self.AgeGroup})"

class ServerMessage:
  def __init__(self, Username, Msg, UserColor="#FFFFFF"):
    self.Username = Username
    self.Msg = Msg
    self.UserColor = UserColor

  def Print(self):
    RichConsole.print(f"[{self.UserColor}]{self.Username}[/]: {self.Msg}")

  def __repr__(self):
    return f"{self.Username}: {self.Msg}"

def PrintRobloxChat():
  for Msg in RobloxChat:
    print(Msg)

def PrintServerChat():
  for Msg in ServerChat:
    print(Msg)

class Account:
  def __init__(self, Age, VisibleAgeGroup=False):
    self.Username = random.choice(usernames)
    self.UserColor = f"#{random.randint(0, 0xFFFFFF):06x}"
    self.Age = Age
    self.SuspectedAgeGroup = None
    self.PossibleAgeGroups = [0, 1, 2, 3, 4, 5]
    self.SeenMsgs = []
    self.RejectedMsgs = []
    self.VisibleAgeGroup = VisibleAgeGroup

  def GetAgeGroup(self):
    if self.Age < 9:
      return 0
    
    if self.Age < 12:
      return 1
    
    if self.Age < 15:
      return 2
    
    if self.Age < 17:
      return 3
    
    if self.Age < 21:
      return 4
    
    return 5
  
  def CanSeeMsg(self, AgeGroup):
    ThisGroup = self.GetAgeGroup()

    if abs(ThisGroup - AgeGroup) <= 1:
      return True
    
    return False
  
  def SendMsg(self):
    AgeGroup = self.GetAgeGroup()
    Msg = f"{random.choice(randomWords)}"
    RobloxMsg = RobloxMessage(self.Username, Msg, AgeGroup)
    ServerMsg = ServerMessage(self.Username, Msg)
    RobloxChat.append(RobloxMsg)
    ServerChat.append(ServerMsg)

    for Acc in Accounts:
      if Acc.CanSeeMsg(AgeGroup):
        Acc.SeenMsgs.append(ServerMsg)
      else:
        Acc.RejectedMsgs.append(ServerMsg)

  def __repr__(self):
    return f"{self.Username}, {self.Age}, {self.GetAgeGroup()}"
  
Accounts = [Account(25, True), Account(12, True)]
# Roblox chat knows age groups, server chat does not
RobloxChat = []
# Server chat is what the server sees, roblox chat is what roblox uses to determine who can see what messages, and is what the accounts use to determine if they can see a message or not
ServerChat = []

for i in range(20):
  NewAcc = Account(random.randint(5, 25))
  Accounts.append(NewAcc)

for i, Acc in enumerate(Accounts):
  Acc.SendMsg()

PrintServerChat()
PrintRobloxChat()