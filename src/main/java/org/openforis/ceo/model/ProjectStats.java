package org.openforis.ceo.model;

public class ProjectStats {
    
    private int flaggedPlots = 0;
    private int analyzedPlots = 0;
    private int unanalyzedPlots = 0;
    private int members = 0;
    private int contributors = 0;
    
    public int getFlaggedPlots() {
        return flaggedPlots;
    }
    
    public void setFlaggedPlots(int flaggedPlots) {
        this.flaggedPlots = flaggedPlots;
    }
    
    public int getAnalyzedPlots() {
        return analyzedPlots;
    }
    
    public void setAnalyzedPlots(int analyzedPlots) {
        this.analyzedPlots = analyzedPlots;
    }
    
    public int getUnanalyzedPlots() {
        return unanalyzedPlots;
    }
    
    public void setUnanalyzedPlots(int unanalyzedPlots) {
        this.unanalyzedPlots = unanalyzedPlots;
    }
    
    public int getMembers() {
        return members;
    }
    
    public void setMembers(int members) {
        this.members = members;
    }
    
    public int getContributors() {
        return contributors;
    }
    
    public void setContributors(int contributors) {
        this.contributors = contributors;
    }
}
