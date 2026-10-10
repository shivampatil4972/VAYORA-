package com.dypcet.journex.hazard;

import com.dypcet.journex.hazard.HazardScoringService.LatestScore;
import com.dypcet.journex.hazard.HazardScoringService.Summary;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Administrators only. A score is a weak, uncertain estimate about a person; showing it
 * to a driver would invite declining passengers on the strength of it.
 */
@RestController
@RequestMapping("/api/v1/admin/hazard")
@PreAuthorize("hasRole('ADMIN')")
public class HazardAdminController {

    private final HazardScoringService scoring;

    public HazardAdminController(HazardScoringService scoring) {
        this.scoring = scoring;
    }

    /** Safe to repeat: a booking already scored today is skipped. */
    @PostMapping("/score")
    public Summary scoreNow() {
        return scoring.scoreActiveBookings();
    }

    @GetMapping("/scores")
    public List<LatestScore> scores() {
        return scoring.latestScores();
    }
}
