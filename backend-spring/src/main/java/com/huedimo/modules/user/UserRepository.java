package com.huedimo.modules.user;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u ORDER BY COALESCE(u.points, 0) DESC, COALESCE(u.checkinCount, 0) DESC, u.createdAt ASC")
    List<User> findTopUsers(Pageable pageable);
}
